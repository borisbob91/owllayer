// CSS for WooPaymentWidget Shadow DOM — modal overlay, stepper, forms, payment buttons

export const PAYMENT_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Backdrop ── */
.backdrop{
  position:fixed;inset:0;
  background:rgba(0,0,0,0.65);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  z-index:2147483645;
  display:flex;align-items:center;justify-content:center;
  animation:fade-in 0.2s ease both;
}
@keyframes fade-in{from{opacity:0}to{opacity:1}}

/* ── Modal ── */
.modal{
  position:relative;
  background:#0b1220;
  border:1px solid #1e293b;
  border-radius:16px;
  width:min(560px,95vw);
  max-height:90vh;
  overflow-y:auto;
  box-shadow:0 25px 60px rgba(0,0,0,0.6);
  animation:modal-in 0.25s ease both;
  scrollbar-width:thin;
  scrollbar-color:#334155 transparent;
}
@keyframes modal-in{
  from{opacity:0;transform:scale(0.96)}
  to{opacity:1;transform:scale(1)}
}

/* ── Close button ── */
.close-btn{
  position:absolute;top:12px;right:12px;
  background:transparent;border:none;cursor:pointer;
  color:#64748b;font-size:20px;line-height:1;padding:4px;
  border-radius:6px;transition:color 0.15s,background 0.15s;
}
.close-btn:hover{color:#e2e8f0;background:#1e293b}

/* ── Header ── */
.modal-header{
  padding:20px 24px 16px;
  border-bottom:1px solid #1e293b;
}
.modal-title{
  font-size:18px;font-weight:700;
  color:#f1f5f9;letter-spacing:-0.02em;
}
.modal-subtitle{font-size:13px;color:#64748b;margin-top:2px}

/* ── Stepper ── */
.stepper{
  display:flex;align-items:center;gap:0;
  padding:16px 24px;
  border-bottom:1px solid #1e293b;
  overflow-x:auto;
}
.step-item{display:flex;align-items:center;gap:6px;flex:1}
.step-dot{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;
  border:2px solid #334155;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;
  color:#64748b;
  transition:all 0.2s;
}
.step-dot.active{border-color:#6366f1;background:#6366f1;color:#fff}
.step-dot.done{border-color:#22c55e;background:#22c55e;color:#fff}
.step-label{font-size:11px;color:#64748b;white-space:nowrap}
.step-label.active{color:#a5b4fc}
.step-connector{flex:1;height:1px;background:#1e293b;margin:0 4px}

/* ── Body ── */
.modal-body{padding:20px 24px}

/* ── Form ── */
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0}
.form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.form-label{font-size:12px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:0.04em}
.form-input{
  background:#1e293b;border:1.5px solid #334155;border-radius:8px;
  padding:10px 14px;color:#e2e8f0;font-size:14px;
  outline:none;transition:border-color 0.15s,box-shadow 0.15s;
  width:100%;
}
.form-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
.form-input::placeholder{color:#475569}

.toggle-row{
  display:flex;align-items:center;gap:8px;
  padding:10px 0;margin-bottom:12px;
  cursor:pointer;
}
.toggle-checkbox{
  width:16px;height:16px;accent-color:#6366f1;cursor:pointer;flex-shrink:0;
}
.toggle-label{font-size:13px;color:#94a3b8;cursor:pointer}

/* ── Section headings ── */
.section-title{font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;
  letter-spacing:0.06em;margin-bottom:12px}

/* ── Shipping rate cards ── */
.rate-card{
  border:2px solid #1e293b;border-radius:10px;padding:12px 16px;cursor:pointer;
  transition:all 0.15s;display:flex;align-items:center;gap:12px;margin-bottom:8px;
  background:#0f172a;
}
.rate-card:hover{border-color:#334155;background:#1e293b}
.rate-card.selected{border-color:#6366f1;background:#1e1b4b}
.rate-radio{width:16px;height:16px;accent-color:#6366f1;flex-shrink:0}
.rate-name{font-size:14px;color:#e2e8f0;flex:1}
.rate-price{font-size:14px;font-weight:700;color:#a5b4fc}
.rate-empty{font-size:13px;color:#64748b;padding:12px 0;text-align:center}

/* ── Promo ── */
.promo-row{display:flex;gap:8px}
.promo-row .form-input{flex:1}
.apply-btn{
  padding:10px 16px;background:#6366f1;color:#fff;border:none;
  border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
  transition:background 0.15s;white-space:nowrap;
}
.apply-btn:hover{background:#4f46e5}
.apply-btn:disabled{background:#334155;color:#64748b;cursor:not-allowed}
.promo-success{font-size:13px;color:#22c55e;margin-top:8px;display:flex;align-items:center;gap:6px}
.promo-error{font-size:13px;color:#f87171;margin-top:8px}
.skip-link{font-size:12px;color:#64748b;cursor:pointer;text-decoration:underline;
  margin-top:8px;display:inline-block;}
.skip-link:hover{color:#94a3b8}

/* ── Order summary ── */
.order-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #1e293b}
.order-item:last-of-type{border-bottom:none}
.order-img{width:48px;height:48px;border-radius:6px;object-fit:cover;background:#1e293b}
.order-info{flex:1;min-width:0}
.order-name{font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.order-qty{font-size:12px;color:#64748b}
.order-price{font-size:13px;font-weight:700;color:#a5b4fc;white-space:nowrap}
.totals-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px}
.totals-row .label{color:#64748b}
.totals-row .value{color:#e2e8f0;font-weight:600}
.total-final{font-size:15px;font-weight:700;margin-top:4px;padding-top:8px;border-top:1px solid #1e293b}
.total-final .label{color:#e2e8f0}
.total-final .value{color:#a5b4fc}

/* ── Payment methods ── */
.pay-section{margin-bottom:16px}
.stripe-wrapper{
  background:#1e293b;border:1.5px solid #334155;border-radius:8px;
  padding:12px 14px;margin:10px 0 14px;
  min-height:40px;
}
.pay-btn{
  width:100%;padding:14px;border-radius:10px;
  font-size:15px;font-weight:700;cursor:pointer;border:none;
  transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;
}
.pay-btn:disabled{opacity:0.5;cursor:not-allowed}
.pay-btn-stripe{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff}
.pay-btn-stripe:hover:not(:disabled){background:linear-gradient(135deg,#4f46e5,#4338ca)}
.pay-btn-paypal{background:#f0b429;color:#1a1a1a}
.pay-btn-paypal:hover:not(:disabled){background:#d9a020}
.pay-btn-redirect{background:#334155;color:#e2e8f0;margin-top:8px}
.pay-btn-redirect:hover:not(:disabled){background:#3f526b}
#paypal-container{margin:10px 0}

/* ── Spinner ── */
.spinner{
  display:inline-block;width:18px;height:18px;
  border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;
  border-radius:50%;animation:spin 0.7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Error / Notice ── */
.error-banner{
  background:#451c1c;border:1px solid #7f1d1d;border-radius:8px;
  color:#f87171;font-size:13px;padding:10px 14px;margin-bottom:12px;
}

/* ── Footer nav ── */
.modal-footer{
  display:flex;justify-content:space-between;align-items:center;
  padding:16px 24px;border-top:1px solid #1e293b;
  gap:12px;
}
.btn-back{
  padding:10px 20px;background:transparent;border:1.5px solid #334155;
  border-radius:8px;color:#94a3b8;font-size:14px;font-weight:600;
  cursor:pointer;transition:all 0.15s;
}
.btn-back:hover{border-color:#94a3b8;color:#e2e8f0}
.btn-next{
  padding:10px 24px;background:#6366f1;border:none;
  border-radius:8px;color:#fff;font-size:14px;font-weight:700;
  cursor:pointer;transition:background 0.15s;
}
.btn-next:hover:not(:disabled){background:#4f46e5}
.btn-next:disabled{background:#334155;color:#64748b;cursor:not-allowed}
`;
