const express = require("express");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const { autenticar } = require("./autenticacao");
const app = express();
const port = process.env.PORT || 8080;

let server; // Declarada no escopo global

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

// Ignorar requisições de favicon
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // Retorna No Content para silenciar
});

// Conexão com o banco de dados PostgreSQL (Railway)
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Rota de health check imediata
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Rota de login
app.post("/api/login", async (req, res) => {
  const { username, senha } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE username = $1 AND senha = $2",
      [username, senha]
    );
    if (result.rowCount === 1) {
      res.cookie("user", "true", { maxAge: 3600000, httpOnly: true }); // 1 hora
      res.status(200).json({ success: true, message: "Login bem-sucedido" });
    } else {
      res
        .status(401)
        .json({ message: "Usuário ou senha inválidos", success: false });
    }
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro no servidor", success: false });
  }
});

// Rotas CRUD
app.get("/api/pedidos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pedidos");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/pedidos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pedidos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao buscar pedido:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.post("/api/pedidos", async (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO pedidos (cliente, produto, quantidade, valor, status, data) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *",
      [cliente, produto, quantidade, valor, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.put("/api/pedidos/:id", async (req, res) => {
  const { cliente, produto, quantidade, valor, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE pedidos SET cliente = $1, produto = $2, quantidade = $3, valor = $4, status = $5, data = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
      [cliente, produto, quantidade, valor, status, req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao atualizar pedido:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.delete("/api/pedidos/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM pedidos WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: "Pedido excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao excluir pedido:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/produtos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/produtos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM produtos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.post("/api/produtos", async (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, categoria, preco, estoque, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.put("/api/produtos/:id", async (req, res) => {
  const { nome, categoria, preco, estoque, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE produtos SET nome = $1, categoria = $2, preco = $3, estoque = $4, status = $5 WHERE id = $6 RETURNING *",
      [nome, categoria, preco, estoque, status, req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.delete("/api/produtos/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM produtos WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: "Produto excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao excluir produto:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/custos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM custos");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar custos:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/custos/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM custos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Custo não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao buscar custo:", err);
    res.status(500).json({ message: "Erro no servidor" });
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
    console.error("Erro ao criar custo:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.put("/api/custos/:id", async (req, res) => {
  const { descricao, categoria, valor, data, tipo } = req.body;
  try {
    const result = await db.query(
      "UPDATE custos SET descricao = $1, categoria = $2, valor = $3, data = $4, tipo = $5 WHERE id = $6 RETURNING *",
      [descricao, categoria, valor, data, tipo, req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Custo não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao atualizar custo:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.delete("/api/custos/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM custos WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: "Custo excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Custo não encontrado" });
    }
  } catch (err) {
    console.error("Erro ao excluir custo:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

// Novos endpoints para dashboard e gráficos
app.get("/api/dashboard", async (req, res) => {
  try {
    const pedidosResult = await db.query("SELECT COUNT(*) FROM pedidos");
    const produtosResult = await db.query(
      "SELECT COUNT(*) FROM produtos WHERE status = 'ativo'"
    );
    const custosResult = await db.query(
      "SELECT COALESCE(SUM(valor), 0) FROM custos"
    );
    const vendasResult = await db.query(
      "SELECT COALESCE(SUM(valor), 0) FROM pedidos WHERE status = 'concluido'"
    );

    const dashboardData = {
      vendasTotais: parseFloat(vendasResult.rows[0].coalesce) || 0,
      pedidosTotais: parseInt(pedidosResult.rows[0].count) || 0,
      produtosEstoque: parseInt(produtosResult.rows[0].count) || 0,
      custosTotais: parseFloat(custosResult.rows[0].coalesce) || 0,
    };
    res.status(200).json(dashboardData);
  } catch (err) {
    console.error("Erro ao buscar dashboard:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/vendas", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT data, valor FROM pedidos WHERE status = 'concluido' ORDER BY data LIMIT 5"
    );
    res
      .status(200)
      .json(
        result.rows.map((row) => ({
          data: row.data,
          valor: parseFloat(row.valor) || 0,
        }))
      );
  } catch (err) {
    console.error("Erro ao buscar vendas:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/lucros", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        TO_CHAR(data, 'Month') AS mes, 
        COALESCE(SUM(valor), 0) AS valor 
      FROM pedidos 
      WHERE status = 'concluido' 
      GROUP BY TO_CHAR(data, 'Month') 
      LIMIT 5
    `);
    res
      .status(200)
      .json(
        result.rows.map((row) => ({
          mes: row.mes,
          valor: parseFloat(row.valor) || 0,
        }))
      );
  } catch (err) {
    console.error("Erro ao buscar lucros:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/produtos-vendidos", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT produto, SUM(quantidade) AS quantidade 
      FROM pedidos 
      WHERE status = 'concluido' 
      GROUP BY produto 
      LIMIT 5
    `);
    res
      .status(200)
      .json(
        result.rows.map((row) => ({
          produto: row.produto,
          quantidade: parseInt(row.quantidade) || 0,
        }))
      );
  } catch (err) {
    console.error("Erro ao buscar produtos vendidos:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

app.get("/api/tendencias", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        TO_CHAR(data, 'Month') AS mes, 
        COUNT(*) AS pedidos, 
        COALESCE(SUM(valor), 0) AS vendas 
      FROM pedidos 
      WHERE status = 'concluido' 
      GROUP BY TO_CHAR(data, 'Month') 
      LIMIT 5
    `);
    res
      .status(200)
      .json(
        result.rows.map((row) => ({
          mes: row.mes,
          pedidos: parseInt(row.pedidos) || 0,
          vendas: parseFloat(row.vendas) || 0,
        }))
      );
  } catch (err) {
    console.error("Erro ao buscar tendências:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

// Inicialização do servidor
async function startServer() {
  try {
    await db.query("SELECT 1");
    console.log("Conexão com o banco de dados estabelecida com sucesso");

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
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    const prod = await db.query("SELECT id FROM produtos WHERE nome = $1", [
      "Cookie Tradicional",
    ]);
    if (prod.rowCount === 0) {
      await db.query(
        "INSERT INTO produtos (nome, categoria, preco, estoque, status) VALUES ($1, $2, $3, $4, $5)",
        ["Cookie Tradicional", "Tradicional", 5.0, 100, "ativo"]
      );
    }
    console.log("Tabelas e dados iniciais criados com sucesso");

    server = app.listen(port, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta ${port}`);
    });

    setInterval(async () => {
      try {
        await db.query("SELECT 1");
        console.log(
          "Verificação de conexão ativa em:",
          new Date().toISOString()
        );
      } catch (err) {
        console.error("Erro na verificação de conexão:", err);
      }
    }, 15000);

    return server;
  } catch (err) {
    console.error("Falha na inicialização:", err);
    process.exit(1);
  }
}

startServer().catch((err) => console.error("Erro na inicialização:", err));

process.on("SIGTERM", () => {
  console.log("Recebido SIGTERM, encerrando servidor...");
  if (server) {
    server.close(() => {
      console.log("Servidor encerrado.");
      process.exit(0);
    });
  } else {
    console.log("Nenhum servidor ativo para encerrar.");
    process.exit(0);
  }
});
