import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided
} from "@hello-pangea/dnd";
import "../styles/components/KanbanBoard.css";

interface Task {
  id: string;
  title: string;
  status: string;
}

const initialTasks: Task[] = [
  { id: "1", title: "Разработка интерфейса", status: "new" },
  { id: "2", title: "Настройка БД", status: "inProgress" },
  { id: "3", title: "Тестирование", status: "done" },
];

const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const updatedTasks = [...tasks];
    const [moved] = updatedTasks.splice(result.source.index, 1);
    moved.status = result.destination.droppableId;
    updatedTasks.splice(result.destination.index, 0, moved);

    setTasks(updatedTasks);
  };

  const columns = {
    new: "Новая",
    inProgress: "В работе",
    done: "Завершена",
  };

  return (
    <div className="kanban-container">
      <DragDropContext onDragEnd={onDragEnd}>
        {Object.entries(columns).map(([key, title]) => (
          <Droppable droppableId={key} key={key}>
            {(provided: DroppableProvided) => (
              <div
                className="kanban-column"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                <h3>{title}</h3>
                {tasks
                  .filter((task) => task.status === key)
                  .map((task, index) => (
                    <Draggable draggableId={task.id} index={index} key={task.id}>
                      {(provided: DraggableProvided) => (
                        <div
                          className="kanban-task"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {task.title}
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
