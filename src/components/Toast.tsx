import { useShop } from '../store/shop';
import { Img } from './Img';
import './Toast.css';

/** The "added to bag" slip that drops from under the navigation. */
export function Toast() {
  const { toast, dismissToast, setCartOpen } = useShop();
  return (
    <div className="toast-wrap" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast" role="status">
          <div className="toast__img">
            <Img name={toast.image} pos={toast.pos} sizes="80px" eager />
          </div>
          <div className="toast__body">
            <p className="t-meta toast__kicker">
              <span className="toast__tick" aria-hidden="true" /> Agregada al carrito
            </p>
            <p className="toast__title">{toast.title}</p>
            <p className="t-meta toast__detail">{toast.detail}</p>
          </div>
          <div className="toast__actions">
            <button className="toast__close" aria-label="Cerrar" onClick={dismissToast}>
              ×
            </button>
            <button
              className="t-label u-link"
              onClick={() => {
                dismissToast();
                setCartOpen(true);
              }}
            >
              Ver carrito
            </button>
          </div>
          <span className="toast__timer" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
