import { DriverFlow } from './features/driver/DriverFlow.jsx';

export function App() {
  return (
    <main className="app-shell">
      <section className="phone-shell" aria-label="CitySend driver app preview">
        <DriverFlow />
      </section>
    </main>
  );
}
