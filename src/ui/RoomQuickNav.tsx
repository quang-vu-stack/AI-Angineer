import React from 'react';
import { OFFICE_ROOMS } from '../world/officeLayout';
import { useGameStore } from '../store/useGameStore';

export const RoomQuickNav: React.FC = () => {
  const focusOnRoom = useGameStore((s) => s.focusOnRoom);

  return (
    <nav className="room-nav" data-testid="room-quick-nav">
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
