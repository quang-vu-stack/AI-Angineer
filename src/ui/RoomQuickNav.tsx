import React from 'react';
import { OFFICE_ROOMS } from '../world/officeLayout';
import { useGameStore } from '../store/useGameStore';

export const RoomQuickNav: React.FC = () => {
  const focusOnRoom = useGameStore((s) => s.focusOnRoom);
  const resetOverviewCamera = useGameStore((s) => s.resetOverviewCamera);

  return (
    <nav className="room-nav" data-testid="room-quick-nav">
      <button
        className="room-pill"
        onClick={resetOverviewCamera}
        style={{ borderColor: '#38bdf8' }}
        data-testid="room-overview-btn"
      >
        Toàn cảnh
      </button>
      {OFFICE_ROOMS.map((room) => (
        <button
          key={room.id}
          className="room-pill"
          onClick={() => focusOnRoom(room.id)}
          style={{ borderColor: room.accentColor }}
        >
          {room.name}
        </button>
      ))}
    </nav>
  );
};
