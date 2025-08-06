const express = require("express");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const { autenticar } = require("./autenticacao");
const app = express();
const port = process.env.PORT || 8080;

process.on("unhandledRejection", (err) => {
  console.error("Rejeição não tratada:", err);
});

app.use(express.json());
app.use(cookieParser());
app.get("/sistema.html", autenticar, (req, res, next) => {
  res.sendFile(__dirname + "/public/sistema.html");
});
app.get("/", (req, res) => {
  res.redirect("/login.html");
});
app.use(express.static("public"));

// Conexão com o banco de dados PostgreSQL (Railway)
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Forçar SSL para Railway
});

// Verificar conexão com o banco de dados
async function checkDatabaseConnection() {
  try {
    await db.query("SELECT 1");
    console.log("Conexão com o banco de dados estabelecida com sucesso");
  } catch (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  }
}

// Criação das tabelas (executar apenas uma vez, depois pode comentar)
async function criarTabelas() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        categoria TEXT NOT NULL,
        preco REAL NOT NULL,
        estoque INTEGER NOT NULL,
        status TEXT NOT NULL
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente TEXT NOT NULL,
        produto TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor REAL NOT NULL,
        status TEXT NOT NULL,
        data TIMESTAMP
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS custos (
        id SERIAL PRIMARY KEY,
        descricao TEXT NOT NULL,
        categoria TEXT NOT NULL,
        valor REAL NOT NULL,
        data DATE NOT NULL,
        tipo TEXT NOT NULL
      );
    `);
    // Usuário admin padrão
    const admin = await db.query(
      "SELECT id FROM usuarios WHERE username = $1",
      ["admin"]
    );
    if (admin.rowCount === 0) {
      await db.query("INSERT INTO usuarios (username, senha) VALUES ($1, $2)", [
        "admin",
        "admin123",
      ]);
    }
    // Produto inicial
    const prod = await db.query("SELECT id FROM produtos WHERE nome = $1", [
      "Cookie Tradicional",
    ]);
    if (prod.rowCount === 0) {
      await db.query(
        "INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES ($1, $2, $3, $4, $5)",
        ["Cookie Tradicional", "Tradicional", 5.0, 100, "ativo"]
      );
    }
  } catch (err) {
    console.error("Erro na criação das tabelas:", err);
  }
}

// Executar verificação de conexão e criação de tabelas
checkDatabaseConnection().catch((err) =>
  console.error("Falha na verificação da conexão:", err)
);
criarTabelas().catch((err) =>
  console.error("Falha na inicialização do banco:", err)
);

// Ignorar requisição de favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Rotas para Pedidos
app.get("/api/pedidos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pedidos");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pedidos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pedidos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pedidos", async (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO pedidos (cliente, produto, quantidade, valor, status, data) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      [cliente, produto, quantidade, valor, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pedidos/:id", async (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE pedidos SET cliente = $1, produto = $2, quantidade = $3, valor = $4, status = $5, data = NOW() WHERE id = $6 RETURNING *",
      [cliente, produto, quantidade, valor, status, req.params.id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pedidos/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM pedidos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ message: "Pedido excluído" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas para Produtos
app.get("/api/produtos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/produtos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Produto não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/produtos", async (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [nome, categoria, preco, estoque, status]
    );
    res.status(201).json({ id: result.rows[0].id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/produtos/:id", async (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  try {
    await db.query(
      "UPDATE produtos SET nome = $1, categoria = $2, preco = $3, estoque = $4, status = $5 WHERE id = $6",
      [nome, categoria, preco, estoque, status, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/produtos/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
    res.json({ message: "Produto excluído" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas para Custos
app.get("/api/custos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM custos");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/custos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM custos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Custo não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/custos", async (req, res) => {
  const { descricao, categoria, valor, data, tipo } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO custos (descricao, categoria, valor, data, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [descricao, categoria, valor, data, tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/custos/:id", async (req, res) => {
  const { descricao, categoria, valor, data, tipo } = req.body;
  try {
    const result = await db.query(
      "UPDATE custos SET descricao = $1, categoria = $2, valor = $3, data = $4, tipo = $5 WHERE id = $6 RETURNING *",
      [descricao, categoria, valor, data, tipo, req.params.id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Custo não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/custos/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM custos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Custo não encontrado" });
    res.json({ message: "Custo excluído" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas para Dados Analíticos
app.get("/api/vendas", (req, res) => {
  db.query(
    "SELECT to_char(data, 'YYYY-MM-DD') as data, COALESCE(SUM(valor), 0) as valor FROM pedidos GROUP BY data",
    [],
    (err, result) => {
      if (err) {
        console.error("Erro na consulta de vendas:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de vendas:", result.rows);
      res.json(
        result.rows.length > 0
          ? result.rows
          : [{ data: new Date().toISOString().split("T")[0], valor: 0 }]
      );
    }
  );
});

app.get("/api/lucros", (req, res) => {
  db.query(
    `
    SELECT to_char(data, 'YYYY-MM') as mes, 
           COALESCE((SELECT SUM(valor) FROM pedidos WHERE to_char(data, 'YYYY-MM') = mes), 0) - COALESCE((SELECT SUM(valor) FROM custos WHERE to_char(data, 'YYYY-MM') = mes), 0) as valor 
    FROM pedidos 
    GROUP BY mes
    ORDER BY mes DESC
    LIMIT 1
  `,
    [],
    (err, result) => {
      if (err) {
        console.error("Erro na consulta de lucros:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de lucros:", result.rows);
      res.json(
        result.rows.length > 0
          ? result.rows.map((row) => ({ mes: row.mes, valor: row.valor || 0 }))
          : [{ mes: new Date().toISOString().slice(0, 7), valor: 0 }]
      );
    }
  );
});

app.get("/api/tendencias", (req, res) => {
  db.query(
    "SELECT to_char(data, 'YYYY-MM') as mes, COALESCE(COUNT(*), 0) as pedidos, COALESCE(SUM(quantidade), 0) as vendas FROM pedidos GROUP BY mes ORDER BY mes DESC",
    [],
    (err, result) => {
      if (err) {
        console.error("Erro na consulta de tendências:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de tendências:", result.rows);
      res.json(
        result.rows.length > 0
          ? result.rows
          : [
              {
                mes: new Date().toISOString().slice(0, 7),
                vendas: 0,
                pedidos: 0,
              },
            ]
      );
    }
  );
});

app.get("/api/produtos-vendidos", (req, res) => {
  db.query(
    "SELECT produto, COALESCE(SUM(quantidade), 0) as quantidade FROM pedidos GROUP BY produto",
    [],
    (err, result) => {
      if (err) {
        console.error("Erro na consulta de produtos vendidos:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Dados de produtos vendidos:", result.rows);
      res.json(
        result.rows.length > 0
          ? result.rows
          : [{ produto: "Nenhum", quantidade: 0 }]
      );
    }
  );
});

app.get("/api/dashboard", (req, res) => {
  db.query(
    "SELECT COALESCE(COUNT(*), 0) as pedidosTotais FROM pedidos",
    [],
    (err, result) => {
      if (err) {
        console.error("Erro na consulta de pedidos totais:", err.message);
        return res.status(500).json({ error: err.message });
      }
      const pedidosTotais = result.rows[0].pedidosTotais || 0;
      db.query(
        "SELECT COALESCE(SUM(valor), 0) as vendasTotais FROM pedidos",
        [],
        (err, result) => {
          if (err) {
            console.error("Erro na consulta de vendas totais:", err.message);
            return res.status(500).json({ error: err.message });
          }
          const vendasTotais = result.rows[0].vendasTotais || 0;
          db.query(
            "SELECT COALESCE(COUNT(*), 0) as produtosEstoque FROM produtos WHERE status = 'ativo'",
            [],
            (err, result) => {
              if (err) {
                console.error(
                  "Erro na consulta de produtos em estoque:",
                  err.message
                );
                return res.status(500).json({ error: err.message });
              }
              const produtosEstoque = result.rows[0].produtosEstoque || 0;
              db.query(
                "SELECT COALESCE(SUM(valor), 0) as custosTotais FROM custos",
                [],
                (err, result) => {
                  if (err) {
                    console.error(
                      "Erro na consulta de custos totais:",
                      err.message
                    );
                    return res.status(500).json({ error: err.message });
                  }
                  const custosTotais = result.rows[0].custosTotais || 0;
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
});
