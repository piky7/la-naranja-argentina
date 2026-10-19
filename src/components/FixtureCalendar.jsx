import { useEffect, useMemo, useRef, useState } from "react";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
const toISO = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export default function FixtureCalendar({ selectedDate, onSelect }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const rootRef = useRef(null);

  useEffect(() => {
    if (open) setVisibleMonth(selectedDate.slice(0, 7));
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const [year, month] = visibleMonth.split("-").map(Number);
  const cells = useMemo(() => {
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const days = new Date(year, month, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [year, month]);

  const changeMonth = (delta) => {
    const next = new Date(year, month - 1 + delta, 1);
    setVisibleMonth(toISO(next.getFullYear(), next.getMonth(), 1).slice(0, 7));
  };

  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC"
  }).format(new Date(`${selectedDate}T12:00:00Z`)).replace(/\./g, "").toUpperCase();

  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long", year: "numeric"
  }).format(new Date(year, month - 1, 1));

  return (
    <div className="fixture-selected-date fixture-date-sport fixture-calendar-anchor" ref={rootRef}>
      <button
        type="button"
        className="fixture-date-trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-label="Elegir fecha del fixture"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <strong>{label}</strong>
      </button>
      {open && (
        <div className="fixture-calendar-popover" role="dialog" aria-label="Calendario del fixture">
          <div className="fixture-calendar-header">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">‹</button>
            <span>{monthLabel}</span>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente">›</button>
          </div>
          <div className="fixture-calendar-grid">
            {weekdays.map((day, index) => <span className="fixture-calendar-weekday" key={index}>{day}</span>)}
            {cells.map((day, index) => day === null
              ? <span key={`empty-${index}`} />
              : <button
                  type="button"
                  key={day}
                  className={toISO(year, month - 1, day) === selectedDate ? "is-selected" : ""}
                  onClick={() => {
                    onSelect(toISO(year, month - 1, day));
                    setOpen(false);
                  }}
                  aria-label={`${day} de ${monthLabel}`}
                >{day}</button>
            )}
          </div>
          <button type="button" className="fixture-calendar-today" onClick={() => {
            const now = new Date();
            onSelect(toISO(now.getFullYear(), now.getMonth(), now.getDate()));
            setOpen(false);
          }}>Ir a hoy</button>
        </div>
      )}
    </div>
  );
}
