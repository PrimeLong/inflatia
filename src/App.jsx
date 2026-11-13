import MacroSimulator from './MacroSimulator.jsx';
import { StorageNotice } from './privacy.jsx';

export default function App() {
  return (
    <>
      {/* уведомление о памяти браузера — до приложения: на телефоне оно в потоке страницы, полосой наверху */}
      <StorageNotice />
      <MacroSimulator />
    </>
  );
}
