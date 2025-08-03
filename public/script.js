// Sistema de Gerenciamento Nutella Cookies Hub
// Desenvolvido com JavaScript vanilla

// URL base da API (usar sempre relativa para funcionar local e no Render)
const API_URL = "/api";

// ========== CONFIGURAÇÕES GLOBAIS ==========
let sidebarAberta = true;
let secaoAtual = "dashboard";

// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", function () {
  inicializarApp();
});

async function inicializarApp() {
  configurarEventos();
  carregarSecao("dashboard");
  await preencherTabelas();
  inicializarGraficos();
  atualizarDashboard();
}

function configurarEventos() {
  // Toggle sidebar
  const btnToggle = document.getElementById("sidebarToggle");
  if (btnToggle) {
    btnToggle.addEventListener("click", alternarSidebar);
  }

  // Links de navegação
  const linksNav = document.querySelectorAll(".nav-link");
  linksNav.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const secao = this.getAttribute("data-section");
      carregarSecao(secao);
    });
  });

  // Modal
  const modal = document.getElementById("modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        fecharModal();
      }
    });
  }

  // Evento de submissão do formulário modal
  const modalForm = document.getElementById("modalForm");
  if (modalForm) {
    modalForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await salvarItemModal();
    });
  }
}

// ========== NAVEGAÇÃO ==========
function alternarSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebarAberta = !sidebarAberta;

  if (sidebarAberta) {
    sidebar.classList.remove("fechada");
  } else {
    sidebar.classList.add("fechada");
  }
}

function carregarSecao(nomeSecao) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const linkAtivo = document.querySelector(`[data-section="${nomeSecao}"]`);
  if (linkAtivo) {
    linkAtivo.classList.add("active");
  }

  document.querySelectorAll(".section-content").forEach((secao) => {
    secao.classList.remove("active");
  });

  const secaoAtiva = document.getElementById(`${nomeSecao}-content`);
  if (secaoAtiva) {
    secaoAtiva.classList.add("active");
  }

  atualizarCabecalho(nomeSecao);
  secaoAtual = nomeSecao;
}

function atualizarCabecalho(secao) {
  const titulos = {
    dashboard: { titulo: "Dashboard", descricao: "Visão geral do negócio" },
    pedidos: { titulo: "Pedidos", descricao: "Gerenciar pedidos de clientes" },
    produtos: { titulo: "Produtos", descricao: "Catálogo de produtos" },
    custos: { titulo: "Custos", descricao: "Controle de despesas" },
    lucros: { titulo: "Lucros", descricao: "Análise de rentabilidade" },
    analises: { titulo: "Análises", descricao: "Relatórios e estatísticas" },
    configuracoes: {
      titulo: "Configurações",
      descricao: "Configurações do sistema",
    },
  };

  const info = titulos[secao] || {
    titulo: "Seção",
    descricao: "Descrição da seção",
  };

  document.getElementById("sectionTitle").textContent = info.titulo;
  document.getElementById("sectionDescription").textContent = info.descricao;
}

// ========== TABELAS ==========
async function preencherTabelas() {
  await preencherTabelaPedidos();
  await preencherTabelaProdutos();
  await preencherTabelaCustos();
}

async function preencherTabelaPedidos() {
  const tbody = document.getElementById("corpoTabelaPedidos");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/pedidos`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const pedidos = await response.json();
    tbody.innerHTML =
      pedidos.length > 0
        ? pedidos
            .map(
              (pedido) => `
        <tr>
            <td>#${pedido.id.toString().padStart(3, "0")}</td>
            <td>${pedido.cliente}</td>
            <td>${pedido.produto}</td>
            <td>${pedido.quantidade} unid.</td>
            <td>R$ ${parseFloat(pedido.valor).toFixed(2).replace(".", ",")}</td>
            <td><span class="status-badge ${pedido.status}">${capitalizar(
                pedido.status
              )}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="editarPedido(${
                  pedido.id
                })" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="excluirPedido(${
                  pedido.id
                })" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
      `
            )
            .join("")
        : '<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar pedidos: ${err.message}</td></tr>`;
  }
}

async function preencherTabelaProdutos() {
  const tbody = document.getElementById("corpoTabelaProdutos");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/produtos`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const produtos = await response.json();
    tbody.innerHTML =
      produtos.length > 0
        ? produtos
            .map(
              (produto) => `
        <tr>
            <td>#${produto.id.toString().padStart(3, "0")}</td>
            <td>${produto.nome}</td>
            <td>${produto.categoria}</td>
            <td>R$ ${parseFloat(produto.preco)
              .toFixed(2)
              .replace(".", ",")}</td>
            <td>${produto.estoque} unid.</td>
            <td><span class="status-badge ${produto.status}">${capitalizar(
                produto.status
              )}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="editarProduto(${
                  produto.id
                })" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="excluirProduto(${
                  produto.id
                })" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
      `
            )
            .join("")
        : '<tr><td colspan="7">Nenhum produto encontrado.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar produtos: ${err.message}</td></tr>`;
  }
}

async function preencherTabelaCustos() {
  const tbody = document.getElementById("corpoTabelaCustos");
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/custos`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const custos = await response.json();
    tbody.innerHTML =
      custos.length > 0
        ? custos
            .map(
              (custo) => `
        <tr>
            <td>#${custo.id.toString().padStart(3, "0")}</td>
            <td>${custo.descricao}</td>
            <td>${custo.categoria}</td>
            <td>R$ ${parseFloat(custo.valor).toFixed(2).replace(".", ",")}</td>
            <td>${formatarData(custo.data)}</td>
            <td><span class="status-badge ${custo.tipo}">${capitalizar(
                custo.tipo
              )}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="editarCusto(${
                  custo.id
                })" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="excluirCusto(${
                  custo.id
                })" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
      `
            )
            .join("")
        : '<tr><td colspan="7">Nenhum custo encontrado.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar custos: ${err.message}</td></tr>`;
  }
}

// ========== MODAIS ==========
async function abrirModal(titulo, campos, tipo, id = null) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalFields = document.getElementById("modalFields");
  modal.dataset.tipo = tipo;
  modal.dataset.id = id || "";

  modalTitle.textContent = titulo;
  modalFields.innerHTML = campos;
  modal.classList.add("active");

  if (tipo === "pedido") {
    const produtoSelect = document.getElementById("produtoPedido");
    const quantidadeInput = document.getElementById("quantidadePedido");
    const valorInput = document.getElementById("valorPedido");

    produtoSelect.addEventListener("change", async () => {
      await calcularValor(produtoSelect, quantidadeInput, valorInput);
    });

    quantidadeInput.addEventListener("input", () => {
      calcularValor(produtoSelect, quantidadeInput, valorInput);
    });

    if (id) {
      await calcularValor(produtoSelect, quantidadeInput, valorInput);
    }
  }
}

async function calcularValor(produtoSelect, quantidadeInput, valorInput) {
  const produtoNome = produtoSelect.value;
  if (produtoNome && quantidadeInput.value) {
    try {
      const response = await fetch(`${API_URL}/produtos?nome=${produtoNome}`);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const produtos = await response.json();
      if (produtos.length > 0) {
        const preco = parseFloat(produtos[0].preco);
        const quantidade = parseInt(quantidadeInput.value);
        valorInput.value = (preco * quantidade).toFixed(2);
      } else {
        valorInput.value = "0.00";
      }
    } catch (err) {
      valorInput.value = "0.00";
    }
  } else {
    valorInput.value = "0.00";
  }
}

function fecharModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
  modal.dataset.tipo = "";
  modal.dataset.id = "";
}

async function novoPedido() {
  try {
    const response = await fetch(`${API_URL}/produtos`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const produtos = await response.json();
    const campos = `
        <div class="form-group">
            <label for="clientePedido">Cliente</label>
            <input type="text" id="clientePedido" class="form-input" required>
        </div>
        <div class="form-group">
            <label for="produtoPedido">Produto</label>
            <select id="produtoPedido" class="form-input" required>
                <option value="">Selecione um produto</option>
                ${produtos
                  .map((p) => `<option value="${p.nome}">${p.nome}</option>`)
                  .join("")}
            </select>
        </div>
        <div class="form-group">
            <label for="quantidadePedido">Quantidade</label>
            <input type="number" id="quantidadePedido" class="form-input" min="1" required>
        </div>
        <div class="form-group">
            <label for="valorPedido">Valor</label>
            <input type="number" id="valorPedido" class="form-input" step="0.01" min="0" readonly>
        </div>
        <div class="form-group">
            <label for="statusPedido">Status</label>
            <select id="statusPedido" class="form-input" required>
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
            </select>
        </div>
    `;
    abrirModal("Novo Pedido", campos, "pedido");
  } catch (err) {
    mostrarMensagem(`Erro ao carregar produtos: ${err.message}`, "error");
  }
}

function novoProduto() {
  const campos = `
      <div class="form-group">
          <label for="nomeProduto">Nome do Produto</label>
          <input type="text" id="nomeProduto" class="form-input" required>
      </div>
      <div class="form-group">
          <label for="categoriaProduto">Categoria</label>
          <select id="categoriaProduto" class="form-input" required>
              <option value="">Selecione uma categoria</option>
              <option value="Tradicional">Tradicional</option>
              <option value="Especial">Especial</option>
              <option value="Premium">Premium</option>
          </select>
      </div>
      <div class="form-group">
          <label for="precoProduto">Preço</label>
          <input type="number" id="precoProduto" class="form-input" step="0.01" min="0" required>
      </div>
      <div class="form-group">
          <label for="estoqueProduto">Estoque</label>
          <input type="number" id="estoqueProduto" class="form-input" min="0" required>
      </div>
      <div class="form-group">
          <label for="statusProduto">Status</label>
          <select id="statusProduto" class="form-input" required>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
          </select>
      </div>
  `;
  abrirModal("Novo Produto", campos, "produto");
}

function novoCusto() {
  const campos = `
      <div class="form-group">
          <label for="descricaoCusto">Descrição</label>
          <input type="text" id="descricaoCusto" class="form-input" required>
      </div>
      <div class="form-group">
          <label for="categoriaCusto">Categoria</label>
          <select id="categoriaCusto" class="form-input" required>
              <option value="">Selecione uma categoria</option>
              <option value="Ingredientes">Ingredientes</option>
              <option value="Material">Material</option>
              <option value="Utilidades">Utilidades</option>
              <option value="Outros">Outros</option>
          </select>
      </div>
      <div class="form-group">
          <label for="valorCusto">Valor</label>
          <input type="number" id="valorCusto" class="form-input" step="0.01" min="0" required>
      </div>
      <div class="form-group">
          <label for="dataCusto">Data</label>
          <input type="date" id="dataCusto" class="form-input" required>
      </div>
      <div class="form-group">
          <label for="tipoCusto">Tipo</label>
          <select id="tipoCusto" class="form-input" required>
              <option value="">Selecione o tipo</option>
              <option value="fixo">Fixo</option>
              <option value="variavel">Variável</option>
          </select>
      </div>
  `;
  abrirModal("Novo Custo", campos, "custo");
}

// ========== OPERAÇÕES CRUD ==========
async function editarPedido(id) {
  try {
    const response = await fetch(`${API_URL}/pedidos/${id}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const pedido = await response.json();
    const responseProdutos = await fetch(`${API_URL}/produtos`);
    if (!responseProdutos.ok) {
      throw new Error(`Erro HTTP: ${responseProdutos.status}`);
    }
    const produtos = await responseProdutos.json();
    const campos = `
        <div class="form-group">
            <label for="clientePedido">Cliente</label>
            <input type="text" id="clientePedido" class="form-input" value="${
              pedido.cliente
            }" required>
        </div>
        <div class="form-group">
            <label for="produtoPedido">Produto</label>
            <select id="produtoPedido" class="form-input" required>
                <option value="">Selecione um produto</option>
                ${produtos
                  .map(
                    (p) =>
                      `<option value="${p.nome}" ${
                        p.nome === pedido.produto ? "selected" : ""
                      }>${p.nome}</option>`
                  )
                  .join("")}
            </select>
        </div>
        <div class="form-group">
            <label for="quantidadePedido">Quantidade</label>
            <input type="number" id="quantidadePedido" class="form-input" min="1" value="${
              pedido.quantidade
            }" required>
        </div>
        <div class="form-group">
            <label for="valorPedido">Valor</label>
            <input type="number" id="valorPedido" class="form-input" step="0.01" min="0" value="${
              pedido.valor
            }" readonly>
        </div>
        <div class="form-group">
            <label for="statusPedido">Status</label>
            <select id="statusPedido" class="form-input" required>
                <option value="pendente" ${
                  pedido.status === "pendente" ? "selected" : ""
                }>Pendente</option>
                <option value="concluido" ${
                  pedido.status === "concluido" ? "selected" : ""
                }>Concluído</option>
                <option value="cancelado" ${
                  pedido.status === "cancelado" ? "selected" : ""
                }>Cancelado</option>
            </select>
        </div>
    `;
    abrirModal(`Editar Pedido #${id}`, campos, "pedido", id);
  } catch (err) {
    mostrarMensagem(`Erro ao carregar pedido: ${err.message}`, "error");
  }
}

async function excluirPedido(id) {
  if (confirm("Tem certeza que deseja excluir este pedido?")) {
    try {
      const response = await fetch(`${API_URL}/pedidos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      await preencherTabelaPedidos();
      mostrarMensagem(data.message, "success");
      await atualizarGraficos();
      await atualizarCardsPorSecao(secaoAtual);
    } catch (err) {
      mostrarMensagem(`Erro ao excluir pedido: ${err.message}`, "error");
    }
  }
}

async function editarProduto(id) {
  try {
    const response = await fetch(`${API_URL}/produtos/${id}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const produto = await response.json();
    const campos = `
        <div class="form-group">
            <label for="nomeProduto">Nome do Produto</label>
            <input type="text" id="nomeProduto" class="form-input" value="${
              produto.nome
            }" required>
        </div>
        <div class="form-group">
            <label for="categoriaProduto">Categoria</label>
            <select id="categoriaProduto" class="form-input" required>
                <option value="">Selecione uma categoria</option>
                <option value="Tradicional" ${
                  produto.categoria === "Tradicional" ? "selected" : ""
                }>Tradicional</option>
                <option value="Especial" ${
                  produto.categoria === "Especial" ? "selected" : ""
                }>Especial</option>
                <option value="Premium" ${
                  produto.categoria === "Premium" ? "selected" : ""
                }>Premium</option>
            </select>
        </div>
        <div class="form-group">
            <label for="precoProduto">Preço</label>
            <input type="number" id="precoProduto" class="form-input" step="0.01" min="0" value="${
              produto.preco
            }" required>
        </div>
        <div class="form-group">
            <label for="estoqueProduto">Estoque</label>
            <input type="number" id="estoqueProduto" class="form-input" min="0" value="${
              produto.estoque
            }" required>
        </div>
        <div class="form-group">
            <label for="statusProduto">Status</label>
            <select id="statusProduto" class="form-input" required>
                <option value="ativo" ${
                  produto.status === "ativo" ? "selected" : ""
                }>Ativo</option>
                <option value="inativo" ${
                  produto.status === "inativo" ? "selected" : ""
                }>Inativo</option>
            </select>
        </div>
    `;
    abrirModal(`Editar Produto #${id}`, campos, "produto", id);
  } catch (err) {
    mostrarMensagem(`Erro ao carregar produto: ${err.message}`, "error");
  }
}

async function excluirProduto(id) {
  if (confirm("Tem certeza que deseja excluir este produto?")) {
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      await preencherTabelaProdutos();
      mostrarMensagem(data.message, "success");
      await atualizarCardsPorSecao(secaoAtual);
    } catch (err) {
      mostrarMensagem(`Erro ao excluir produto: ${err.message}`, "error");
    }
  }
}

async function editarCusto(id) {
  try {
    const response = await fetch(`${API_URL}/custos/${id}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const custo = await response.json();
    const campos = `
        <div class="form-group">
            <label for="descricaoCusto">Descrição</label>
            <input type="text" id="descricaoCusto" class="form-input" value="${
              custo.descricao
            }" required>
        </div>
        <div class="form-group">
            <label for="categoriaCusto">Categoria</label>
            <select id="categoriaCusto" class="form-input" required>
                <option value="">Selecione uma categoria</option>
                <option value="Ingredientes" ${
                  custo.categoria === "Ingredientes" ? "selected" : ""
                }>Ingredientes</option>
                <option value="Material" ${
                  custo.categoria === "Material" ? "selected" : ""
                }>Material</option>
                <option value="Utilidades" ${
                  custo.categoria === "Utilidades" ? "selected" : ""
                }>Utilidades</option>
                <option value="Outros" ${
                  custo.categoria === "Outros" ? "selected" : ""
                }>Outros</option>
            </select>
        </div>
        <div class="form-group">
            <label for="valorCusto">Valor</label>
            <input type="number" id="valorCusto" class="form-input" step="0.01" min="0" value="${
              custo.valor
            }" required>
        </div>
        <div class="form-group">
            <label for="dataCusto">Data</label>
            <input type="date" id="dataCusto" class="form-input" value="${
              custo.data
            }" required>
        </div>
        <div class="form-group">
            <label for="tipoCusto">Tipo</label>
            <select id="tipoCusto" class="form-input" required>
                <option value="">Selecione o tipo</option>
                <option value="fixo" ${
                  custo.tipo === "fixo" ? "selected" : ""
                }>Fixo</option>
                <option value="variavel" ${
                  custo.tipo === "variavel" ? "selected" : ""
                }>Variável</option>
            </select>
        </div>
    `;
    abrirModal(`Editar Custo #${id}`, campos, "custo", id);
  } catch (err) {
    mostrarMensagem(`Erro ao carregar custo: ${err.message}`, "error");
  }
}

async function excluirCusto(id) {
  if (confirm("Tem certeza que deseja excluir este custo?")) {
    try {
      const response = await fetch(`${API_URL}/custos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      await preencherTabelaCustos();
      mostrarMensagem(data.message, "success");
      await atualizarCardsPorSecao(secaoAtual);
    } catch (err) {
      mostrarMensagem(`Erro ao excluir custo: ${err.message}`, "error");
    }
  }
}

async function salvarItemModal() {
  const modal = document.getElementById("modal");
  const tipo = modal.dataset.tipo;
  const id = modal.dataset.id;

  try {
    if (tipo === "pedido") {
      const pedido = {
        cliente: document.getElementById("clientePedido").value,
        produto: document.getElementById("produtoPedido").value,
        quantidade: parseInt(document.getElementById("quantidadePedido").value),
        valor: parseFloat(document.getElementById("valorPedido").value),
        status: document.getElementById("statusPedido").value,
      };
      const method = id ? "PUT" : "POST";
      const url = id ? `${API_URL}/pedidos/${id}` : `${API_URL}/pedidos`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      setTimeout(async () => {
        await preencherTabelas();
        fecharModal();
        mostrarMensagem(
          id ? "Pedido atualizado com sucesso!" : "Pedido criado com sucesso!",
          "success"
        );
        await atualizarGraficos();
        await atualizarCardsPorSecao(secaoAtual);
      }, 500);
    } else if (tipo === "produto") {
      const produto = {
        nome: document.getElementById("nomeProduto").value,
        categoria: document.getElementById("categoriaProduto").value,
        preco: parseFloat(document.getElementById("precoProduto").value),
        estoque: parseInt(document.getElementById("estoqueProduto").value),
        status: document.getElementById("statusProduto").value,
      };
      const method = id ? "PUT" : "POST";
      const url = id ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produto),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      await preencherTabelaProdutos();
      fecharModal();
      mostrarMensagem(
        id ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!",
        "success"
      );
      await atualizarCardsPorSecao(secaoAtual);
    } else if (tipo === "custo") {
      const custo = {
        descricao: document.getElementById("descricaoCusto").value,
        categoria: document.getElementById("categoriaCusto").value,
        valor: parseFloat(document.getElementById("valorCusto").value),
        data: document.getElementById("dataCusto").value,
        tipo: document.getElementById("tipoCusto").value,
      };
      const method = id ? "PUT" : "POST";
      const url = id ? `${API_URL}/custos/${id}` : `${API_URL}/custos`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(custo),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      await preencherTabelaCustos();
      fecharModal();
      mostrarMensagem(
        id ? "Custo atualizado com sucesso!" : "Custo criado com sucesso!",
        "success"
      );
      await atualizarCardsPorSecao(secaoAtual);
    }
  } catch (err) {
    mostrarMensagem(`Erro ao salvar item: ${err.message}`, "error");
  }
}

// ========== GRÁFICOS ==========
async function atualizarGraficos() {
  await criarGraficoVendas();
  await criarGraficoLucros();
  await criarGraficoProdutos();
  await criarGraficoTendencia();
}

async function inicializarGraficos() {
  setTimeout(atualizarGraficos, 500);
}

async function criarGraficoVendas() {
  const ctx = document.getElementById("vendasChart");
  if (!ctx) return;

  // Destruir gráfico existente apenas se existir
  if (window.vendasChart && typeof window.vendasChart.destroy === "function") {
    window.vendasChart.destroy();
  }

  try {
    const response = await fetch(`${API_URL}/vendas`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const dados = await response.json();
    const labels = dados.map((d) => d.data);
    const valores = dados.map((d) => d.valor);

    window.vendasChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length > 0 ? labels : ["Sem dados"],
        datasets: [
          {
            label: "Vendas (R$)",
            data: valores.length > 0 ? valores : [0],
            borderColor: "hsl(25, 35%, 25%)",
            backgroundColor: "hsla(25, 35%, 25%, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "R$ " + value;
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar dados de vendas:", err);
    window.vendasChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Sem dados"],
        datasets: [
          {
            label: "Vendas (R$)",
            data: [0],
            borderColor: "hsl(25, 35%, 25%)",
            backgroundColor: "hsla(25, 35%, 25%, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "R$ " + value;
              },
            },
          },
        },
      },
    });
  }
}

async function criarGraficoLucros() {
  const ctx = document.getElementById("lucrosChart");
  if (!ctx) return;

  if (window.lucrosChart && typeof window.lucrosChart.destroy === "function") {
    window.lucrosChart.destroy();
  }

  try {
    const response = await fetch(`${API_URL}/lucros`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const dados = await response.json();
    const labels = dados.map((d) => d.mes);
    const valores = dados.map((d) => d.valor);

    window.lucrosChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length > 0 ? labels : ["Sem dados"],
        datasets: [
          {
            label: "Lucro Mensal (R$)",
            data: valores.length > 0 ? valores : [0],
            backgroundColor: "hsl(25, 35%, 25%)",
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "R$ " + value;
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar dados de lucros:", err);
    window.lucrosChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Sem dados"],
        datasets: [
          {
            label: "Lucro Mensal (R$)",
            data: [0],
            backgroundColor: "hsl(25, 35%, 25%)",
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "R$ " + value;
              },
            },
          },
        },
      },
    });
  }
}

async function criarGraficoProdutos() {
  const ctx = document.getElementById("produtosChart");
  if (!ctx) return;

  if (
    window.produtosChart &&
    typeof window.produtosChart.destroy === "function"
  ) {
    window.produtosChart.destroy();
  }

  try {
    const response = await fetch(`${API_URL}/produtos-vendidos`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const dados = await response.json();
    const labels = dados.map((d) => d.produto);
    const valores = dados.map((d) => d.quantidade);

    window.produtosChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.length > 0 ? labels : ["Sem dados"],
        datasets: [
          {
            data: valores.length > 0 ? valores : [0],
            backgroundColor: [
              "hsl(25, 35%, 25%)",
              "hsl(35, 25%, 45%)",
              "hsl(40, 30%, 65%)",
              "hsl(35, 20%, 75%)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar dados de produtos vendidos:", err);
    window.produtosChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Sem dados"],
        datasets: [
          {
            data: [0],
            backgroundColor: ["hsl(25, 35%, 25%)"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }
}

async function criarGraficoTendencia() {
  const ctx = document.getElementById("tendenciaChart");
  if (!ctx) return;

  if (
    window.tendenciaChart &&
    typeof window.tendenciaChart.destroy === "function"
  ) {
    window.tendenciaChart.destroy();
  }

  try {
    const response = await fetch(`${API_URL}/tendencias`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const dados = await response.json();
    const labels = dados.map((d) => d.mes);
    const vendas = dados.map((d) => d.vendas);
    const pedidos = dados.map((d) => d.pedidos);

    window.tendenciaChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length > 0 ? labels : ["Sem dados"],
        datasets: [
          {
            label: "Vendas",
            data: vendas.length > 0 ? vendas : [0],
            borderColor: "hsl(25, 35%, 25%)",
            backgroundColor: "hsla(25, 35%, 25%, 0.1)",
          },
          {
            label: "Pedidos",
            data: pedidos.length > 0 ? pedidos : [0],
            borderColor: "hsl(40, 30%, 45%)",
            backgroundColor: "hsla(40, 30%, 45%, 0.1)",
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("Erro ao carregar dados de tendências:", err);
    window.tendenciaChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Sem dados"],
        datasets: [
          {
            label: "Vendas",
            data: [0],
            borderColor: "hsl(25, 35%, 25%)",
            backgroundColor: "hsla(25, 35%, 25%, 0.1)",
          },
          {
            label: "Pedidos",
            data: [0],
            borderColor: "hsl(40, 30%, 45%)",
            backgroundColor: "hsla(40, 30%, 45%, 0.1)",
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}

// ========== DASHBOARD ==========
async function atualizarDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const dados = await response.json();
    document.getElementById(
      "vendasTotais"
    ).textContent = `R$ ${dados.vendasTotais.toFixed(2).replace(".", ",")}`;
    document.getElementById("pedidosTotais").textContent = dados.pedidosTotais;
    document.getElementById("produtosEstoque").textContent =
      dados.produtosEstoque;
    document.getElementById(
      "custosTotais"
    ).textContent = `R$ ${dados.custosTotais.toFixed(2).replace(".", ",")}`;
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
    document.getElementById("vendasTotais").textContent = "R$ 0,00";
    document.getElementById("pedidosTotais").textContent = "0";
    document.getElementById("produtosEstoque").textContent = "0";
    document.getElementById("custosTotais").textContent = "R$ 0,00";
  }
}

// ========== UTILITÁRIOS ==========
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarData(data) {
  const d = new Date(data);
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0"); // +1 porque os meses começam em 0
  const ano = d.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

function mostrarMensagem(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao ${tipo}`;
  notificacao.textContent = mensagem;

  Object.assign(notificacao.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    zIndex: "9999",
    maxWidth: "300px",
    opacity: "0",
    transform: "translateX(100%)",
    transition: "all 0.3s ease",
  });

  const cores = {
    success: "hsl(120, 50%, 45%)",
    error: "hsl(0, 75%, 55%)",
    warning: "hsl(45, 95%, 55%)",
    info: "hsl(210, 50%, 55%)",
  };

  notificacao.style.backgroundColor = cores[tipo] || cores.info;
  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.opacity = "1";
    notificacao.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notificacao.style.opacity = "0";
    notificacao.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.parentNode.removeChild(notificacao);
      }
    }, 300);
  }, 3000);
}

// ========== ATUALIZAÇÃO DE CARDS POR ABA ==========
async function atualizarCardsPorSecao(secao) {
  switch (secao) {
    case "dashboard":
      await atualizarDashboard();
      break;
    case "pedidos":
      await atualizarCardsPedidos();
      break;
    case "produtos":
      await atualizarCardsProdutos();
      break;
    case "custos":
      await atualizarCardsCustos();
      break;
    case "lucros":
      await atualizarCardsLucros();
      break;
    case "analises":
      await atualizarCardsAnalises();
      break;
    case "configuracoes":
      await atualizarCardsConfiguracoes();
      break;
  }
}

async function atualizarCardsPedidos() {
  try {
    const response = await fetch(`${API_URL}/pedidos`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const pedidos = await response.json();
    document.getElementById("pedidosTotaisPedidos").textContent =
      pedidos.length;
    const pendentes = pedidos.filter((p) => p.status === "pendente").length;
    document.getElementById("pedidosPendentes").textContent = pendentes;
  } catch (err) {
    console.error("Erro ao carregar cards de pedidos:", err);
    document.getElementById("pedidosTotaisPedidos").textContent = "0";
    document.getElementById("pedidosPendentes").textContent = "0";
  }
}

async function atualizarCardsProdutos() {
  try {
    const response = await fetch(`${API_URL}/produtos`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const produtos = await response.json();
    document.getElementById("totalProdutos").textContent = produtos.length;
    const ativos = produtos.filter((p) => p.status === "ativo").length;
    document.getElementById("produtosAtivos").textContent = ativos;
  } catch (err) {
    console.error("Erro ao carregar cards de produtos:", err);
    document.getElementById("totalProdutos").textContent = "0";
    document.getElementById("produtosAtivos").textContent = "0";
  }
}

async function atualizarCardsCustos() {
  try {
    const response = await fetch(`${API_URL}/custos`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const custos = await response.json();
    const totalCustos = custos.reduce((sum, c) => sum + parseFloat(c.valor), 0);
    document.getElementById(
      "custosTotaisCustos"
    ).textContent = `R$ ${totalCustos.toFixed(2).replace(".", ",")}`;
    const fixos = custos
      .filter((c) => c.tipo === "fixo")
      .reduce((sum, c) => sum + parseFloat(c.valor), 0);
    document.getElementById("custosFixos").textContent = `R$ ${fixos
      .toFixed(2)
      .replace(".", ",")}`;
  } catch (err) {
    console.error("Erro ao carregar cards de custos:", err);
    document.getElementById("custosTotaisCustos").textContent = "R$ 0,00";
    document.getElementById("custosFixos").textContent = "R$ 0,00";
  }
}

async function atualizarCardsLucros() {
  try {
    const responseLucros = await fetch(`${API_URL}/lucros`);
    if (!responseLucros.ok)
      throw new Error(`Erro HTTP: ${responseLucros.status}`);
    const lucros = await responseLucros.json();
    const totalLucro = lucros.reduce((sum, l) => sum + parseFloat(l.valor), 0);
    document.getElementById("lucroTotal").textContent = `R$ ${totalLucro
      .toFixed(2)
      .replace(".", ",")}`;
    const mediaMensal = lucros.length > 0 ? totalLucro / lucros.length : 0;
    document.getElementById("lucroMedioMensal").textContent = `R$ ${mediaMensal
      .toFixed(2)
      .replace(".", ",")}`;
  } catch (err) {
    console.error("Erro ao carregar cards de lucros:", err);
    document.getElementById("lucroTotal").textContent = "R$ 0,00";
    document.getElementById("lucroMedioMensal").textContent = "R$ 0,00";
  }
}

async function atualizarCardsAnalises() {
  try {
    const response = await fetch(`${API_URL}/dashboard`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const dados = await response.json();
    document.getElementById(
      "vendasTotaisAnalises"
    ).textContent = `R$ ${dados.vendasTotais.toFixed(2).replace(".", ",")}`;
    document.getElementById("pedidosTotaisAnalises").textContent =
      dados.pedidosTotais;
  } catch (err) {
    console.error("Erro ao carregar cards de análises:", err);
    document.getElementById("vendasTotaisAnalises").textContent = "R$ 0,00";
    document.getElementById("pedidosTotaisAnalises").textContent = "0";
  }
}

async function atualizarCardsConfiguracoes() {
  try {
    // Simulação de configurações salvas (ajustar conforme backend)
    document.getElementById("configSalvas").textContent = "1"; // Exemplo
  } catch (err) {
    console.error("Erro ao carregar cards de configurações:", err);
    document.getElementById("configSalvas").textContent = "0";
  }
}

// ========== INICIALIZAÇÃO (AJUSTADA) ==========
async function inicializarApp() {
  configurarEventos();
  carregarSecao("dashboard");
  await preencherTabelas();
  inicializarGraficos();
  await atualizarCardsPorSecao(secaoAtual); // Inicializa cards da seção atual
}

// ========== NAVEGAÇÃO (AJUSTADA) ==========
function carregarSecao(nomeSecao) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  const linkAtivo = document.querySelector(`[data-section="${nomeSecao}"]`);
  if (linkAtivo) linkAtivo.classList.add("active");

  document.querySelectorAll(".section-content").forEach((secao) => {
    secao.classList.remove("active");
  });
  const secaoAtiva = document.getElementById(`${nomeSecao}-content`);
  if (secaoAtiva) secaoAtiva.classList.add("active");

  atualizarCabecalho(nomeSecao);
  secaoAtual = nomeSecao;
  atualizarCardsPorSecao(secaoAtual); // Atualiza cards ao mudar de seção
}

// ========== RESPONSIVIDADE MOBILE ==========
function verificarMobile() {
  return window.innerWidth <= 768;
}

window.addEventListener("resize", function () {
  const sidebar = document.getElementById("sidebar");
  if (verificarMobile()) {
    sidebar.classList.add("fechada");
    sidebarAberta = false;
  }
});

if (verificarMobile()) {
  document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.add("fechada");
    sidebarAberta = false;
  });
}
