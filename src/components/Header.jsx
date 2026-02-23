import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ user, onSignIn, onSignOut }) {
  const initial = user?.displayName?.[0] || user?.email?.[0] || '?';
  const displayName = user?.displayName || user?.email || 'Signed in';

  return (
    <header className="app-header">
      <motion.h1
        className="app-title"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Session Timer
      </motion.h1>

      <AnimatePresence mode="wait">
        {user ? (
          <motion.div
            key="user"
            className="auth-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="auth-user">
              <div className="auth-avatar">{initial}</div>
              <span>{displayName}</span>
            </div>
            <button className="btn-signout" onClick={onSignOut}>Sign out</button>
          </motion.div>
        ) : (
          <motion.button
            key="signin"
            className="btn btn-google"
            onClick={onSignIn}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Sign in with Google
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
}
