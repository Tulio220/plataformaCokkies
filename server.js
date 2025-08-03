const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cookieParser = require('cookie-parser');
const { autenticar } = require('./autenticacao');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());
// Protege o acesso ao sistema.html (apenas logado pode acessar)
app.get('/sistema.html', autenticar, (req, res, next) => {
  res.sendFile(__dirname + '/public/sistema.html');
});
app.use(express.static("public"));

// Conexão com o banco de dados SQLite
const db = new sqlite3.Database("database.db");

db.serialize(() => {
  // Tabela de usuários para login
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL
    )
  `);

  // Usuário padrão (admin:admin123) só será inserido se não existir
  db.get("SELECT id FROM usuarios WHERE username = ?", ["admin"], (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO usuarios (username, senha) VALUES (?, ?)`,
        ["admin", "admin123"]
      );
    }
  });
// Rota de login (autenticação simples)
app.post("/api/login", (req, res) => {
  const { username, senha } = req.body;
  db.get(
    "SELECT * FROM usuarios WHERE username = ? AND senha = ?",
    [username, senha],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: "Usuário ou senha inválidos" });
      // Define cookie de sessão simples
      res.cookie('user', JSON.stringify({ id: row.id, username: row.username }), { httpOnly: true });
      res.json({ message: "Login realizado com sucesso", user: { id: row.id, username: row.username } });
    }
  );
});
// Rota de logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('user');
  res.json({ message: 'Logout realizado com sucesso' });
});
  // Criar tabelas se não existirem (com a coluna 'data' incluída)
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      produto TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      valor REAL NOT NULL,
      status TEXT NOT NULL,
      data TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      categoria TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER NOT NULL,
      status TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      tipo TEXT NOT NULL
    )
  `);

  // Migração: Adicionar coluna 'data' sem valor padrão e preencher com data atual
  db.run("ALTER TABLE pedidos ADD COLUMN data TEXT", (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Erro na migração da coluna 'data':", err.message);
    } else if (!err) {
      console.log(
        "Coluna 'data' adicionada com sucesso. Atualizando valores..."
      );
      db.run(
        "UPDATE pedidos SET data = datetime('now') WHERE data IS NULL",
        (err) => {
          if (err)
            console.error("Erro ao atualizar valores de 'data':", err.message);
          else console.log("Valores de 'data' atualizados com sucesso.");
        }
      );
    }
  });

  // Dados iniciais (opcional)
  // Produto inicial só será inserido se não existir produto com mesmo nome
  db.get("SELECT id FROM produtos WHERE nome = ?", ["Cookie Tradicional"], (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES (?, ?, ?, ?, ?)`,
        ["Cookie Tradicional", "Tradicional", 5.0, 100, "ativo"]
      );
    }
  });
});

// Ignorar requisição de favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Rotas para Pedidos
app.get("/api/pedidos", (req, res) => {
  db.all("SELECT * FROM pedidos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/pedidos/:id", (req, res) => {
  db.get("SELECT * FROM pedidos WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(row);
  });
});

app.post("/api/pedidos", (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  db.run(
    "INSERT INTO pedidos (cliente, produto, quantidade, valor, status, data) VALUES (?, ?, ?, ?, ?, datetime('now'))",
    [cliente, produto, quantidade, valor, status],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res
        .status(201)
        .json({ id: this.lastID, ...req.body, data: new Date().toISOString() });
    }
  );
});

app.put("/api/pedidos/:id", (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  db.run(
    "UPDATE pedidos SET cliente = ?, produto = ?, quantidade = ?, valor = ?, status = ?, data = datetime('now') WHERE id = ?",
    [cliente, produto, quantidade, valor, status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

app.delete("/api/pedidos/:id", (req, res) => {
  db.run("DELETE FROM pedidos WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Pedido excluído" });
  });
});

// Rotas para Produtos
app.get("/api/produtos", (req, res) => {
  db.all("SELECT * FROM produtos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/produtos/:id", (req, res) => {
  db.get("SELECT * FROM produtos WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(row);
  });
});

app.post("/api/produtos", (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  db.run(
    "INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES (?, ?, ?, ?, ?)",
    [nome, categoria, preco, estoque, status],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

app.put("/api/produtos/:id", (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  db.run(
    "UPDATE produtos SET nome = ?, categoria = ?, preco = ?, estoque = ?, status = ? WHERE id = ?",
    [nome, categoria, preco, estoque, status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

app.delete("/api/produtos/:id", (req, res) => {
  db.run("DELETE FROM produtos WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Produto excluído" });
  });
});

// Rotas para Custos
app.get("/api/custos", (req, res) => {
  db.all("SELECT * FROM custos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/custos/:id", (req, res) => {
  db.get("SELECT * FROM custos WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Custo não encontrado" });
    res.json(row);
  });
});

app.post("/api/custos", (req, res) => {
  const { descricao, categoria, valor, data, tipo } = req.body;
  db.run(
    "INSERT INTO custos (descricao, categoria, valor, data, tipo) VALUES (?, ?, ?, ?, ?)",
    [descricao, categoria, valor, data, tipo],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

app.put("/api/custos/:id", (req, res) => {
  const { descricao, categoria, valor, data, tipo } = req.body;
  db.run(
    "UPDATE custos SET descricao = ?, categoria = ?, valor = ?, data = ?, tipo = ? WHERE id = ?",
    [descricao, categoria, valor, data, tipo, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

app.delete("/api/custos/:id", (req, res) => {
  db.run("DELETE FROM custos WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Custo excluído" });
  });
});

// Rotas para Dados Analíticos (Dinâmicas com Banco)
app.get("/api/vendas", (req, res) => {
  db.all(
    "SELECT datetime(data, '-3 hours') as data, COALESCE(SUM(valor), 0) as valor FROM pedidos GROUP BY data",
    [],
    (err, rows) => {
      if (err) {
        console.error("Erro na consulta de vendas:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de vendas:", rows);
      res.json(
        rows.length > 0
          ? rows
          : [{ data: new Date().toISOString().split("T")[0], valor: 0 }]
      );
    }
  );
});

app.get("/api/lucros", (req, res) => {
  db.all(
    `
    SELECT strftime('%m', datetime(COALESCE(data, datetime('now', '-3 hours')))) as mes, 
           COALESCE((SELECT SUM(valor) FROM pedidos), 0) - COALESCE((SELECT SUM(valor) FROM custos), 0) as valor 
    FROM pedidos 
    GROUP BY mes
    LIMIT 1
  `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Erro na consulta de lucros:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de lucros:", rows);
      res.json(
        rows.length > 0
          ? rows.map((row) => ({ mes: row.mes, valor: row.valor || 0 }))
          : [{ mes: new Date().toISOString().slice(5, 7), valor: 0 }]
      );
    }
  );
});

app.get("/api/tendencias", (req, res) => {
  db.all(
    "SELECT strftime('%m', datetime(COALESCE(data, datetime('now', '-3 hours')))) as mes, COALESCE(COUNT(*), 0) as pedidos, COALESCE(SUM(quantidade), 0) as vendas FROM pedidos GROUP BY mes",
    [],
    (err, rows) => {
      if (err) {
        console.error("Erro na consulta de tendências:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de tendências:", rows);
      res.json(
        rows.length > 0
          ? rows
          : [
              {
                mes: new Date().toISOString().slice(5, 7),
                vendas: 0,
                pedidos: 0,
              },
            ]
      );
    }
  );
});

app.get("/api/produtos-vendidos", (req, res) => {
  db.all(
    "SELECT produto, COALESCE(SUM(quantidade), 0) as quantidade FROM pedidos GROUP BY produto",
    [],
    (err, rows) => {
      if (err) {
        console.error("Erro na consulta de produtos vendidos:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de produtos vendidos:", rows);
      res.json(rows.length > 0 ? rows : [{ produto: "Nenhum", quantidade: 0 }]);
    }
  );
});

app.get("/api/dashboard", (req, res) => {
  db.get(
    "SELECT COALESCE(COUNT(*), 0) as pedidosTotais FROM pedidos",
    [],
    (err, row) => {
      if (err) {
        console.error("Erro na consulta de pedidos totais:", err.message);
        return res.status(500).json({ error: err.message });
      }
      const pedidosTotais = row.pedidosTotais || 0;
      db.get(
        "SELECT COALESCE(SUM(valor), 0) as vendasTotais FROM pedidos",
        [],
        (err, row) => {
          if (err) {
            console.error("Erro na consulta de vendas totais:", err.message);
            return res.status(500).json({ error: err.message });
          }
          const vendasTotais = row.vendasTotais || 0;
          db.get(
            "SELECT COALESCE(COUNT(*), 0) as produtosEstoque FROM produtos WHERE status = 'ativo'",
            [],
            (err, row) => {
              if (err) {
                console.error(
                  "Erro na consulta de produtos em estoque:",
                  err.message
                );
                return res.status(500).json({ error: err.message });
              }
              const produtosEstoque = row.produtosEstoque || 0;
              db.get(
                "SELECT COALESCE(SUM(valor), 0) as custosTotais FROM custos",
                [],
                (err, row) => {
                  if (err) {
                    console.error(
                      "Erro na consulta de custos totais:",
                      err.message
                    );
                    return res.status(500).json({ error: err.message });
                  }
                  const custosTotais = row.custosTotais || 0;
                  res.json({
                    vendasTotais,
                    pedidosTotais,
                    produtosEstoque,
                    custosTotais,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.listen(port, () =>
  console.log(`Servidor rodando em http://localhost:${port}`)
);
