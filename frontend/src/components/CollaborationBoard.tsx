import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CandidateCard { id: string; name: string; role: string; score: number; }
interface Column { id: string; title: string; items: CandidateCard[]; }

const INITIAL_COLS: Column[] = [
  { id: 'review', title: 'To Review', items: [{ id: '1', name: 'Alice Chen', role: 'Frontend', score: 92 }, { id: '3', name: 'Charlie Davis', role: 'Product', score: 75 }] },
  { id: 'shortlist', title: 'Shortlisted', items: [{ id: '2', name: 'Bob Smith', role: 'Backend', score: 88 }] },
  { id: 'offer', title: 'Offer Extended', items: [] },
  { id: 'reject', title: 'Rejected', items: [{ id: '4', name: 'Diana Prince', role: 'Frontend', score: 40 }] }
];

function SortableItem({ item }: { item: CandidateCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: item });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white p-4 mb-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#1D5A85] transition-colors group">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-[#1A1A1A] group-hover:text-[#1D5A85] transition-colors">{item.name}</h4>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.score >= 80 ? 'bg-green-100 text-green-700' : item.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{item.score}</span>
      </div>
      <p className="text-xs text-[#8792A2] font-medium">{item.role}</p>
    </div>
  );
}

export function CollaborationBoard() {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLS);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find the columns
    let activeColIdx = columns.findIndex(col => col.items.some(i => i.id === activeId));
    let overColIdx = columns.findIndex(col => col.id === overId || col.items.some(i => i.id === overId));

    if (activeColIdx === -1 || overColIdx === -1) return;

    const activeCol = columns[activeColIdx];
    const overCol = columns[overColIdx];

    const activeItemIdx = activeCol.items.findIndex(i => i.id === activeId);
    let overItemIdx = overCol.items.findIndex(i => i.id === overId);
    
    // Dropping onto an empty column or at the end
    if (overItemIdx === -1) {
      if (over.id === overCol.id) overItemIdx = overCol.items.length;
      else return; 
    }

    setColumns(prev => {
      const newCols = [...prev];
      const activeItem = newCols[activeColIdx].items[activeItemIdx];

      if (activeColIdx === overColIdx) {
        // Same column reorder
        const items = [...newCols[activeColIdx].items];
        items.splice(activeItemIdx, 1);
        items.splice(overItemIdx, 0, activeItem);
        newCols[activeColIdx] = { ...newCols[activeColIdx], items };
      } else {
        // Different column move
        const sourceItems = [...newCols[activeColIdx].items];
        const destItems = [...newCols[overColIdx].items];
        sourceItems.splice(activeItemIdx, 1);
        destItems.splice(overItemIdx, 0, activeItem);
        newCols[activeColIdx] = { ...newCols[activeColIdx], items: sourceItems };
        newCols[overColIdx] = { ...newCols[overColIdx], items: destItems };
      }
      return newCols;
    });
  };

  return (
    <div className="p-8 h-full flex flex-col bg-[#F4F5F7]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#0A2540]">Hiring Pipeline</h2>
        <p className="text-[#8792A2]">Drag and drop candidates to update their status and trigger team notifications.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1 h-[600px]">
          {columns.map(col => (
            <div key={col.id} className="w-80 shrink-0 flex flex-col bg-gray-100/50 rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80 rounded-t-xl">
                <h3 className="font-bold text-[#1A1A1A]">{col.title}</h3>
                <span className="bg-white text-[#8792A2] text-xs font-bold px-2 py-1 rounded-md shadow-sm">{col.items.length}</span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                {/* We use strict Dndkit Droppable hooks abstracted safely by SortableContext mapping */}
                <SortableContext id={col.id} items={col.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="min-h-[100px] h-full" id={col.id}>
                    {col.items.map(item => <SortableItem key={item.id} item={item} />)}
                    {col.items.length === 0 && <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[#8792A2] text-sm">Drop candidates here</div>}
                  </div>
                </SortableContext>
              </div>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
