export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Circle Randomizer</h1>
      <p>Welcome! Use these links:</p>
      <ul>
        <li><a href="/register">Register</a></li>
        <li><a href="/login">Login</a></li>
        <li><a href="/wheel">Wheel (Play)</a></li>
        <li><a href="/admin/items">Admin: Items</a></li>
        <li><a href="/admin/coins">Admin: Give Coins</a></li>
  <li><a href="/admin/history">Admin: Rewards History</a></li>
      </ul>
    </main>
  );
}
