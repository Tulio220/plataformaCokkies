// Middleware simples para proteger rotas (verifica se está logado via cookie)
function autenticar(req, res, next) {
  if (req.cookies && req.cookies.user) {
    return next();
  }
  res.redirect('/login.html');
}

module.exports = { autenticar };
