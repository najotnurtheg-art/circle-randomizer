// app/wheel/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

const WAGERS = [50, 100, 200];

export default function WheelPage() {
  const [me, setMe] = useState(null);
  const [segments, setSegments] = useState([]);
  const [wager, setWager] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinState, setSpinState] = useState(null);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState(null);
  const [wins, setWins] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const anglePerSegment = useMemo(
    () => (segments.length ? 360 / segments.length : 0),
    [segments.length]
  );

  const currentSpinnerText = useMemo(() => {
    if (!spinState) return "";
    if (spinState.status !== "SPINNING" || !spinState.username) return "";
    return `${spinState.username} aylantiryapti...`;
  }, [spinState]);

  function computeTargetRotation(resultIndex, durationMs) {
    if (!segments.length) return rotation;
    const baseTurns = 5; // 5 full turns before stop
    const finalAngle =
      360 * baseTurns + (360 - resultIndex * anglePerSegment) - anglePerSegment / 2;
    return finalAngle;
  }

  async function fetchMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) throw new Error("me_failed");
    const data = await res.json();
    const u = data.user || data;
    const newMe = {
      id: u.id,
      login: u.login,
      name: u.name,
      role: u.role,
      balance: u.balance || 0,
    };
    setMe(newMe);
    return newMe;
  }

  async function fetchSegmentsFn(w) {
    const res = await fetch(`/api/segments?wager=${w}`, { cache: "no-store" });
    if (!res.ok) throw new Error("segments_failed");
    const data = await res.json();
    setSegments(data.segments || data);
  }

  async function fetchSpinState() {
    try {
      const res = await fetch("/api/spin/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSpinState(data);

      if (data && data.status === "SPINNING" && data.resultIndex != null) {
        const now = Date.now();
        const start = data.spinStartAt ? new Date(data.spinStartAt).getTime() : now;
        const duration = data.durationMs || 10000;
        const elapsed = Math.min(Math.max(now - start, 0), duration);
        const progress = elapsed / duration;

        const target = computeTargetRotation(data.resultIndex, duration);
        const currentAngle = target * progress;
        setRotation(currentAngle);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchRecentWins() {
    try {
      const res = await fetch("/api/recent-wins", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setWins(data.wins || data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchStore() {
    try {
      const res = await fetch("/api/store", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStoreItems(data.items || data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || data);
    } catch (e) {
      console.error(e);
    }
  }

  // initial load + polling
  useEffect(() => {
    let intervalId;

    (async () => {
      try {
        await fetchMe();
        await fetchSegmentsFn(wager);
        await fetchSpinState();
        await fetchRecentWins();
        await fetchStore();
        await fetchUsers();
      } catch (e) {
        console.error(e);
        setError("Xatolik. Iltimos, sahifani yangilang.");
      } finally {
        setLoading(false);
      }
    })();

    intervalId = setInterval(() => {
      fetchSpinState();
      fetchRecentWins();
      fetchUsers();
    }, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChangeWager(newWager) {
    if (isSpinning) return;
    setWager(newWager);
    await fetchSegmentsFn(newWager);
    setRotation(0);
  }

  async function handleSpin() {
    try {
      setError(null);

      if (!me) {
        setError("Avval tizimga kiring.");
        return;
      }
      if (isSpinning) return;
      if (me.balance < wager) {
        setError("Balansingiz yetarli emas.");
        return;
      }

      setIsSpinning(true);

      // IMPORTANT: this matches your original repo (POST /api/spin)
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wager }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setIsSpinning(false);
        setError((data && data.error) || "SERVER_ERROR");
        await fetchSpinState();
        return;
      }

      const data = await res.json();
      setSpinState(data);

      if (data.resultIndex == null) {
        setIsSpinning(false);
        await fetchSpinState();
        return;
      }

      const duration = data.durationMs || 10000;
      const target = computeTargetRotation(data.resultIndex, duration);

      requestAnimationFrame(() => {
        setRotation(target);
      });

      setTimeout(async () => {
        try {
          const res2 = await fetch("/api/spin/complete", {
            method: "POST",
          });
          const result = await res2.json().catch(() => null);

          if (res2.ok && result && result.prize) {
            setWinner(result.prize);
          } else if (!res2.ok) {
            setError((result && result.error) || "SERVER_ERROR");
          }
        } catch (e) {
          console.error(e);
          setError("SERVER_ERROR");
        } finally {
          setIsSpinning(false);
          const updated = await fetchMe();
          setMe(updated);
          await fetchSpinState();
          await fetchRecentWins(); // refresh rewards immediately after spin
        }
      }, (data.durationMs || 10000) + 200);
    } catch (e) {
      console.error(e);
      setError("SERVER_ERROR");
      setIsSpinning(false);
    }
  }

  async function handleBuy(storeItemId, price) {
    try {
      setError(null);
      if (!me) {
        setError("Avval tizimga kiring.");
        return;
      }
      if (me.balance < price) {
        setError("Balansingiz yetarli emas.");
        return;
      }

      const res = await fetch("/api/store/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeItemId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.ok) {
        setError((data && data.error) || "SERVER_ERROR");
        return;
      }

      const newBalance = Number(data.newBalance || 0);
      setMe((prev) =>
        prev ? { ...prev, balance: newBalance } : prev
      );

      // refresh rewards so store purchase appears if logged there
      await fetchRecentWins();
    } catch (e) {
      console.error(e);
      setError("SERVER_ERROR");
    }
  }

  const isLocked =
    spinState && spinState.status === "SPINNING" && spinState.isLocked;

  const spinDisabled =
    isSpinning || isLocked || !me || (me && me.balance < wager);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-8">
      <div className="flex w-full max-w-6xl gap-6 px-4">
        {/* LEFT: users */}
        <div className="w-60">
          <h2 className="text-xl font-semibold mb-2">Foydalanuvchilar</h2>
          {users.length === 0 ? (
            <p className="text-sm text-gray-400">
              Hozircha foydalanuvchilar yo&apos;q.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex justify-between border-b border-gray-800 py-1"
                >
                  <span>{u.name || u.login}</span>
                  <span className="text-emerald-400">{u.balance}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CENTER: wheel */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* wager buttons */}
          <div className="flex gap-2 mb-2">
            {WAGERS.map((w) => (
              <button
                key={w}
                onClick={() => handleChangeWager(w)}
                disabled={isSpinning || isLocked}
                className={`px-5 py-2 rounded-md text-sm font-semibold border border-gray-700 ${
                  wager === w
                    ? "bg-emerald-500 text-black"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* current spinner */}
          <div className="h-6 text-sm text-amber-300 font-semibold">
            {currentSpinnerText}
          </div>

          {/* pointer */}
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[20px] border-l-transparent border-r-transparent border-b-amber-400 mb-[-10px]" />

          {/* wheel */}
          <div className="relative w-[340px] h-[340px] md:w-[420px] md:h-[420px]">
            <div
              className="absolute inset-0 rounded-full border-[10px] border-gray-800 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? "transform 10s cubic-bezier(0.2, 0.9, 0.1, 1)"
                  : undefined,
              }}
            >
              {segments.map((seg, idx) => {
                const startAngle = idx * anglePerSegment;
                const endAngle = startAngle + anglePerSegment;
                const largeArc = anglePerSegment > 180 ? 1 : 0;
                const radius = 200;

                const x1 =
                  radius +
                  radius * Math.cos((Math.PI * startAngle) / 180);
                const y1 =
                  radius +
                  radius * Math.sin((Math.PI * startAngle) / 180);
                const x2 =
                  radius +
                  radius * Math.cos((Math.PI * endAngle) / 180);
                const y2 =
                  radius +
                  radius * Math.sin((Math.PI * endAngle) / 180);

                const d = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                const colors = [
                  "#06b6d4",
                  "#f59e0b",
                  "#22c55e",
                  "#60a5fa",
                  "#f472b6",
                  "#a78bfa",
                  "#fb7185",
                  "#34d399",
                ];
                const fill = colors[idx % colors.length];

                const textAngle = startAngle + anglePerSegment / 2;

                return (
                  <svg
                    key={idx}
                    viewBox="0 0 400 400"
                    className="absolute inset-0"
                  >
                    <path d={d} fill={fill} stroke="#111827" />
                    <text
                      x="200"
                      y="200"
                      fill="#fff"
                      fontSize="16"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle},200,200) translate(0,-120) rotate(90,200,200)`}
                    >
                      {seg.label}
                    </text>
                  </svg>
                );
              })}
              {/* center circle */}
              <div className="absolute inset-[34%] rounded-full bg-black flex items-center justify-center text-sm font-semibold">
                Super Aylana
              </div>
            </div>
          </div>

          {/* balance + spin */}
          <div className="flex items-center gap-4 mt-4">
            <div className="px-4 py-2 rounded-md bg-gray-900 text-sm">
              Balance:{" "}
              <span className="font-semibold text-emerald-400">
                {me && me.balance != null ? me.balance : 0}
              </span>
            </div>
            <button
              onClick={handleSpin}
              disabled={spinDisabled}
              className={`px-8 py-2 rounded-md text-sm font-semibold ${
                spinDisabled
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black"
              }`}
            >
              {isSpinning || isLocked
                ? "Aylanmoqda..."
                : `Aylantirish (${wager})`}
            </button>
          </div>

          {/* store under wheel */}
          {storeItems.length > 0 && (
            <div className="mt-8 w-full">
              <h3 className="text-lg font-semibold mb-2">Do&apos;kon</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                {storeItems
                  .filter((i) => i.active)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-800 rounded-lg p-3 flex flex-col gap-2 bg-gray-950"
                    >
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-emerald-400">
                        {item.price} coin
                      </div>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-24 object-cover rounded-md"
                        />
                      )}
                      <button
                        onClick={() =>
                          handleBuy(item.id, item.price)
                        }
                        className="mt-auto px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                      >
                        Sotib olish
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* logged in info */}
          <div className="mt-4 text-xs text-gray-400">
            {me
              ? `Logged in as: ${me.name || me.login} (login: ${
                  me.login
                })`
              : "Tizimga kirmagansiz"}
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-400">{error}</div>
          )}
        </div>

        {/* RIGHT: recent wins */}
        <div className="w-72">
          <h2 className="text-xl font-semibold mb-2">
            So&apos;nggi yutuqlar
          </h2>
          {wins.length === 0 ? (
            <p className="text-sm text-gray-400">
              Hozircha yutuqlar yo&apos;q.
            </p>
          ) : (
            <div className="space-y-2">
              {wins.map((w) => (
                <div
                  key={w.id}
                  className="bg-gray-900 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="font-semibold text-emerald-400">
                    {w.username}
                  </div>
                  <div className="text-gray-100">{w.prize}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(w.createdAt).toLocaleTimeString()} —{" "}
                    {w.wager} coin
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* winner popup */}
      {winner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl px-8 py-6 max-w-md text-center shadow-xl">
            <div className="text-lg mb-3">
              <span className="font-semibold">
                {me ? me.name || me.login : ""}
              </span>{" "}
              siz{" "}
              <span className="font-semibold text-emerald-400">
                {winner}
              </span>{" "}
              yutib oldingiz!
            </div>
            <button
              onClick={() => setWinner(null)}
              className="mt-2 px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
