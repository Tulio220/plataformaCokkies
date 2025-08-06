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

// Rota de health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Manter o processo vivo com uma verificação leve
setInterval(async () => {
  try {
    await db.query("SELECT 1");
    console.log("Verificação de conexão ativa em:", new Date().toISOString());
  } catch (err) {
    console.error("Erro na verificação de conexão:", err);
  }
}, 30000); // Verifica a cada 30 segundos

// Executar verificação de conexão e criação de tabelas
checkDatabaseConnection().catch((err) =>
  console.error("Falha na verificação da conexão:", err)
);
criarTabelas().catch((err) =>
  console.error("Falha na inicialização do banco:", err)
);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Capturar sinais de término para evitar saída abrupta
process.on("SIGTERM", () => {
  console.log("Recebido SIGTERM, encerrando servidor...");
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});
