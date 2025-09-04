// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/signin');
  }
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    res.redirect('/');
  } else {
    next();
  }
};

module.exports = { requireAuth, redirectIfAuthenticated };
