"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X, Plus, Pencil, Check } from "lucide-react";
import {
  assignMesa,
  updateMesaPosition,
  createMesa,
  deleteMesa,
  updateMesa,
} from "@/actions/mesas";
import type { Mesa } from "@/actions/mesas";

interface ReservaMapa {
  id: string;
  nombre: string;
  apellido: string;
  hora: string;
  personas: number;
  estado: string;
  mesa_id: string | null;
  telefono: string | null;
}

interface Props {
  mesas: Mesa[];
  reservas: ReservaMapa[];
  fecha: string;
}

// ---- Badge de estado ----
function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    confirmada: "bg-green-100 text-green-800",
    llegado: "bg-blue-100 text-blue-800",
    pendiente_aprobacion: "bg-yellow-100 text-yellow-800",
  };
  const cls = map[estado] ?? "bg-gray-100 text-gray-700";
  const labels: Record<string, string> = {
    confirmada: "Confirmada",
    llegado: "Llegado",
    pendiente_aprobacion: "Pendiente",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

// ---- Chip de reserva (sidebar) ----
function ReservaChip({
  reserva,
  dragging,
}: {
  reserva: ReservaMapa;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `reserva-${reserva.id}` });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-gray-200 rounded-lg p-2 cursor-grab active:cursor-grabbing shadow-sm select-none ${
        dragging ? "ring-2 ring-blue-400" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold text-sm">{reserva.hora.slice(0, 5)}</span>
        <EstadoBadge estado={reserva.estado} />
      </div>
      <p className="text-sm text-gray-700 mt-0.5">
        {reserva.nombre} {reserva.apellido}
      </p>
      <p className="text-xs text-gray-500">{reserva.personas} personas</p>
    </div>
  );
}

// ---- Chip mini (para mostrar dentro de la mesa) ----
function ReservaChipMini({ reserva }: { reserva: ReservaMapa }) {
  return (
    <div className="text-xs mt-1 leading-tight">
      <span className="font-medium">{reserva.hora.slice(0, 5)}</span>
      {" · "}
      {reserva.nombre} {reserva.apellido.charAt(0)}.
    </div>
  );
}

// ---- Mesa en el canvas ----
function MesaNode({
  mesa,
  reserva,
  editMode,
  onDelete,
  onUpdate,
}: {
  mesa: Mesa;
  reserva: ReservaMapa | undefined;
  editMode: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { nombre?: string; capacidad?: number; forma?: "rect" | "round" }) => void;
}) {
  const isOcupada = !!reserva;

  // Droppable (para asignar reservas a la mesa)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `mesa-${mesa.id}`,
    disabled: editMode,
  });

  // Draggable (solo en modo edición, para mover mesas)
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({
    id: `mesa-edit-${mesa.id}`,
    disabled: !editMode,
  });

  // Inline editing
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreVal, setNombreVal] = useState(mesa.nombre);
  const [capacidadVal, setCapacidadVal] = useState(String(mesa.capacidad));

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${mesa.pos_x}%`,
    top: `${mesa.pos_y}%`,
    transform: `translate(-50%, -50%)${transform ? ` translate(${transform.x}px, ${transform.y}px)` : ""}`,
    width: mesa.forma === "round" ? 80 : 100,
    height: mesa.forma === "round" ? 80 : 70,
    borderRadius: mesa.forma === "round" ? "50%" : 8,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  let colorClass =
    "bg-green-50 border-2 border-green-400";
  if (isOver) colorClass = "bg-blue-100 border-2 border-blue-400";
  else if (isOcupada) colorClass = "bg-amber-50 border-2 border-amber-400";

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const saveNombre = () => {
    setEditingNombre(false);
    const cap = parseInt(capacidadVal, 10);
    onUpdate(mesa.id, {
      nombre: nombreVal,
      capacidad: isNaN(cap) ? mesa.capacidad : cap,
    });
  };

  return (
    <div
      ref={combinedRef}
      style={baseStyle}
      className={`${colorClass} flex flex-col items-center justify-center cursor-default select-none ${
        editMode ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      {...(editMode ? attributes : {})}
      {...(editMode ? listeners : {})}
    >
      {editMode && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(mesa.id);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] z-10 hover:bg-red-600"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {editMode && editingNombre ? (
        <div
          className="flex flex-col items-center gap-1 p-1 w-full"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            className="w-full text-xs text-center border border-gray-300 rounded px-1 py-0.5"
            value={nombreVal}
            onChange={(e) => setNombreVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveNombre()}
          />
          <input
            className="w-12 text-xs text-center border border-gray-300 rounded px-1 py-0.5"
            type="number"
            value={capacidadVal}
            onChange={(e) => setCapacidadVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveNombre()}
          />
          <button
            onClick={saveNombre}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="font-bold text-xs text-gray-800 text-center px-1 leading-tight">
            {mesa.nombre}
          </div>
          <div className="text-[10px] text-gray-500">{mesa.capacidad}p</div>
          {reserva && <ReservaChipMini reserva={reserva} />}
          {editMode && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingNombre(true);
              }}
              className="absolute bottom-0.5 right-0.5 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---- Drop zone "sin mesa" (sidebar) para desasignar ----
function SidebarDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "sidebar-unassign" });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col gap-2 min-h-[80px] rounded-lg p-1 transition-colors ${
        isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ---- Formulario añadir mesa ----
function AddMesaForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: { nombre: string; capacidad: number; forma: "rect" | "round" }) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState("4");
  const [forma, setForma] = useState<"rect" | "round">("rect");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <h3 className="font-semibold text-sm text-gray-800 mb-2">Nueva mesa</h3>
      <div className="flex flex-col gap-2">
        <input
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="Nombre (ej: Mesa 1)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="Capacidad"
          type="number"
          min={1}
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          value={forma}
          onChange={(e) => setForma(e.target.value as "rect" | "round")}
        >
          <option value="rect">Rectangular</option>
          <option value="round">Redonda</option>
        </select>
        <div className="flex gap-2 mt-1">
          <button
            className="flex-1 bg-gray-900 text-white text-sm py-1.5 rounded hover:bg-gray-700"
            onClick={() => {
              if (!nombre.trim()) return;
              const cap = parseInt(capacidad, 10);
              onAdd({ nombre: nombre.trim(), capacidad: isNaN(cap) ? 4 : cap, forma });
            }}
          >
            Añadir
          </button>
          <button
            className="flex-1 border border-gray-300 text-sm py-1.5 rounded hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Componente principal ----
export function FloorMap({ mesas: initialMesas, reservas: initialReservas, fecha }: Props) {
  const [mesas, setMesas] = useState<Mesa[]>(initialMesas);
  const [reservas, setReservas] = useState<ReservaMapa[]>(initialReservas);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Reservas sin mesa
  const sinMesa = reservas.filter((r) => !r.mesa_id);
  // Reservas asignadas
  const asignadas = reservas.filter((r) => !!r.mesa_id);

  const getReservaForMesa = useCallback(
    (mesaId: string) => reservas.find((r) => r.mesa_id === mesaId),
    [reservas]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = String(active.id);

    // --- Mover mesa (modo edición) ---
    if (activeId.startsWith("mesa-edit-") && editMode) {
      const mesaId = activeId.replace("mesa-edit-", "");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mesa = mesas.find((m) => m.id === mesaId);
      if (!mesa) return;

      // delta relativo al canvas
      const dx = event.delta.x;
      const dy = event.delta.y;

      const newPosX = Math.min(95, Math.max(5, mesa.pos_x + (dx / rect.width) * 100));
      const newPosY = Math.min(95, Math.max(5, mesa.pos_y + (dy / rect.height) * 100));

      // Optimistic update
      setMesas((prev) =>
        prev.map((m) => (m.id === mesaId ? { ...m, pos_x: newPosX, pos_y: newPosY } : m))
      );
      updateMesaPosition(mesaId, newPosX, newPosY).catch(() => {
        // Revert on error
        setMesas((prev) =>
          prev.map((m) => (m.id === mesaId ? { ...m, pos_x: mesa.pos_x, pos_y: mesa.pos_y } : m))
        );
      });
      return;
    }

    // --- Asignar reserva a mesa ---
    if (activeId.startsWith("reserva-") && !editMode) {
      const reservaId = activeId.replace("reserva-", "");
      const overId = String(over.id);

      if (overId.startsWith("mesa-")) {
        const mesaId = overId.replace("mesa-", "");
        // Optimistic update
        setReservas((prev) =>
          prev.map((r) => (r.id === reservaId ? { ...r, mesa_id: mesaId } : r))
        );
        assignMesa(reservaId, mesaId).catch(() => {
          setReservas((prev) =>
            prev.map((r) => (r.id === reservaId ? { ...r, mesa_id: null } : r))
          );
        });
      } else if (overId === "sidebar-unassign") {
        // Desasignar
        const prev_mesa_id = reservas.find((r) => r.id === reservaId)?.mesa_id ?? null;
        setReservas((prev) =>
          prev.map((r) => (r.id === reservaId ? { ...r, mesa_id: null } : r))
        );
        assignMesa(reservaId, null).catch(() => {
          setReservas((prev) =>
            prev.map((r) => (r.id === reservaId ? { ...r, mesa_id: prev_mesa_id } : r))
          );
        });
      }
    }
  };

  const handleAddMesa = async (data: { nombre: string; capacidad: number; forma: "rect" | "round" }) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Mesa = {
      id: tempId,
      nombre: data.nombre,
      capacidad: data.capacidad,
      forma: data.forma,
      pos_x: 20,
      pos_y: 20,
      activa: true,
    };
    setMesas((prev) => [...prev, optimistic]);
    setShowAddForm(false);

    const result = await createMesa(data);
    if (result.ok && result.id) {
      setMesas((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: result.id! } : m))
      );
    } else {
      setMesas((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleDeleteMesa = async (mesaId: string) => {
    const mesa = mesas.find((m) => m.id === mesaId);
    setMesas((prev) => prev.filter((m) => m.id !== mesaId));
    const result = await deleteMesa(mesaId);
    if (!result.ok && mesa) {
      setMesas((prev) => [...prev, mesa]);
    }
  };

  const handleUpdateMesa = async (
    mesaId: string,
    data: { nombre?: string; capacidad?: number; forma?: "rect" | "round" }
  ) => {
    setMesas((prev) =>
      prev.map((m) => (m.id === mesaId ? { ...m, ...data } : m))
    );
    await updateMesa(mesaId, data);
  };

  // Drag overlay content
  const getDragOverlayContent = () => {
    if (!draggingId) return null;
    if (draggingId.startsWith("reserva-")) {
      const reservaId = draggingId.replace("reserva-", "");
      const reserva = reservas.find((r) => r.id === reservaId);
      if (!reserva) return null;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg w-44">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-sm">{reserva.hora.slice(0, 5)}</span>
            <EstadoBadge estado={reserva.estado} />
          </div>
          <p className="text-sm text-gray-700 mt-0.5">
            {reserva.nombre} {reserva.apellido}
          </p>
          <p className="text-xs text-gray-500">{reserva.personas} personas</p>
        </div>
      );
    }
    if (draggingId.startsWith("mesa-edit-")) {
      const mesaId = draggingId.replace("mesa-edit-", "");
      const mesa = mesas.find((m) => m.id === mesaId);
      if (!mesa) return null;
      return (
        <div
          style={{
            width: mesa.forma === "round" ? 80 : 100,
            height: mesa.forma === "round" ? 80 : 70,
            borderRadius: mesa.forma === "round" ? "50%" : 8,
          }}
          className="bg-gray-200 border-2 border-gray-400 flex items-center justify-center shadow-lg"
        >
          <span className="font-bold text-xs text-gray-700">{mesa.nombre}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
        <button
          onClick={() => {
            setEditMode((v) => !v);
            setShowAddForm(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
            editMode
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          {editMode ? "Salir del modo edición" : "Modo Edición"}
        </button>
        {editMode && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir mesa
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{fecha}</span>
      </div>

      {/* Main layout */}
      <div className="flex gap-0 h-full">
        {/* Canvas */}
        <div className="flex-1 p-4">
          {showAddForm && (
            <div className="mb-4 max-w-xs">
              <AddMesaForm
                onAdd={handleAddMesa}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}
          <div
            ref={canvasRef}
            style={{
              position: "relative",
              height: 600,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            {mesas.map((mesa) => (
              <MesaNode
                key={mesa.id}
                mesa={mesa}
                reserva={getReservaForMesa(mesa.id)}
                editMode={editMode}
                onDelete={handleDeleteMesa}
                onUpdate={handleUpdateMesa}
              />
            ))}
            {mesas.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                No hay mesas configuradas.{" "}
                {editMode ? "Usa «Añadir mesa» para crear una." : "Activa el modo edición para añadir mesas."}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l border-gray-200 bg-white flex flex-col p-3 gap-4 overflow-y-auto">
          {/* Sin asignar */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Sin asignar ({sinMesa.length})
            </h3>
            <SidebarDropZone>
              {sinMesa.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Todas las reservas están asignadas
                </p>
              )}
              {sinMesa.map((r) => (
                <ReservaChip
                  key={r.id}
                  reserva={r}
                  dragging={draggingId === `reserva-${r.id}`}
                />
              ))}
            </SidebarDropZone>
          </div>

          {/* Asignadas */}
          {asignadas.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Asignadas ({asignadas.length})
              </h3>
              <div className="flex flex-col gap-1.5">
                {asignadas.map((r) => {
                  const mesa = mesas.find((m) => m.id === r.mesa_id);
                  return (
                    <div
                      key={r.id}
                      className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5 border border-gray-100"
                    >
                      <span className="font-medium">{mesa?.nombre ?? "Mesa"}</span>
                      {" · "}
                      {r.hora.slice(0, 5)} {r.nombre} {r.apellido}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>{getDragOverlayContent()}</DragOverlay>
    </DndContext>
  );
}
