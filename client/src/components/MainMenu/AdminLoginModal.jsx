import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import styles from './AdminLoginModal.module.css';

export default function AdminLoginModal({ open, onClose }) {
  const { login, error, setError } = useAdmin();
  const [pwd, setPwd] = useState('');
  const [loading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pwd) return;
    const ok = login(pwd);
    if (ok) { setPwd(''); onClose(); }
  };

  const handleClose = () => {
    setPwd('');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className={styles.root} data-game>
        <div className={styles.icon}>🔐</div>
        <h2 className={styles.title}>Administratora pieslēgšanās</h2>
        <p className={styles.subtitle}>Ievadi administratora paroli, lai piekļūtu testa panelim</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="password"
            placeholder="Parole…"
            value={pwd}
            autoFocus
            onChange={e => { setPwd(e.target.value); setError(''); }}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Pārbauda…' : 'Pieslēgties'}
          </button>
        </form>
        <button className={styles.cancelBtn} onClick={handleClose}>Atcelt</button>
      </div>
    </Modal>
  );
}
