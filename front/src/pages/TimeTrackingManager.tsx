import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Button,
  DatePicker,
  notification,
  Dropdown,
  Tooltip,
  Modal,
  Input,
} from "antd";

import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  FilterOutlined,
  EyeOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Tabs, Table } from "antd";
import HeaderManager from "../components/HeaderManager";
import SidebarManager from "../components/SidebarManager";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/ru";

import "../styles/pages/TimeTrackingEmployee.css"; // можно использовать те же стили

dayjs.extend(isoWeek);
dayjs.locale("ru");

const { Content } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface RawTimeEntry {
  ID_Execution: string;
  ID_Task: string;
  Task_Name: string;
  Order_Name: string;
  Start_Date: string;
  End_Date: string;
  Hours_Spent: number;
  Description?: string;
  Attachments?: string[];
  ID_User: string;
  ID_Employee: string;
  link?: string; // уже есть
  Hours_Spent_Total?: number;
  Time_Norm?: number;
  FitTimeNorm?: boolean;
  Employee_Name?: string; // 🔥 добавил
}

interface Project {
  ID_Order: string;
  Order_Name: string;
}

const TimeTrackingManager: React.FC = () => {
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf("isoWeek"));
  const [timeEntries, setTimeEntries] = useState<RawTimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [api, contextHolder] = notification.useNotification();
  const [searchQuery, setSearchQuery] = useState<string>("");

  const weekDaysRu = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];
  const [viewingEntry, setViewingEntry] = useState<RawTimeEntry | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const toggleDayExpansion = (dayKey: string) => {
    setExpandedDays((prev) =>
      prev.includes(dayKey)
        ? prev.filter((d) => d !== dayKey)
        : [...prev, dayKey]
    );
  };

  const fetchTimeEntries = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/time-tracking/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allEntries: RawTimeEntry[] = await res.json();
      setTimeEntries(allEntries);

      // Собираем проекты
      const uniqueProjects = Array.from(
        new Set(allEntries.map((e) => e.Order_Name))
      ).map((name, index) => ({
        ID_Order: `P-${index}`, // фиктивный ID для фильтрации
        Order_Name: name,
      }));
      setProjects(uniqueProjects);
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      api.error({ message: "Ошибка загрузки данных" });
    }
  }, [api]);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  const getFilteredEntriesByDay = (day: dayjs.Dayjs) =>
    filteredEntries.filter((entry) =>
      dayjs(entry.Start_Date).isSame(day, "day")
    );

  const filteredEntries = timeEntries
    .filter((entry) =>
      selectedProjectId
        ? entry.Order_Name ===
          projects.find((p) => p.ID_Order === selectedProjectId)?.Order_Name
        : true
    )
    .filter((entry) => {
      const query = searchQuery.trim().toLowerCase();
      return (
        entry.Task_Name.toLowerCase().includes(query) ||
        entry.Order_Name.toLowerCase().includes(query) ||
        (entry.Employee_Name?.toLowerCase().includes(query) ?? false)
      );
    });

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));

  return (
    <Layout className="layout">
      {contextHolder}
      <SidebarManager />
      <Layout className="main-layout">
        <HeaderManager />
        <Content className="content">
          <div className="page-content">
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                flexBasis: "100%",
                marginTop: "32px",
                marginBottom: "24px",
              }}
            >
              Учёт времени сотрудников
            </h1>

            <Tabs
              defaultActiveKey="cards"
              type="card"
              items={[
                {
                  key: "cards",
                  label: "Карточки",
                  children: (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end", // 👈 Переносим всё вправо
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "1rem",
                          width: "100%",
                          padding: "24px 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "1rem",
                          }}
                        >
                          <Button
                            icon={<LeftOutlined />}
                            onClick={() =>
                              setWeekStart(weekStart.subtract(1, "week"))
                            }
                          />
                          <h2 style={{ margin: "0 1rem" }}>
                            {weekStart.format("D MMMM")} –{" "}
                            {weekStart.add(6, "day").format("D MMMM YYYY")}
                          </h2>
                          <Button
                            icon={<RightOutlined />}
                            onClick={() =>
                              setWeekStart(weekStart.add(1, "week"))
                            }
                          />
                          <DatePicker
                            value={weekStart}
                            format="DD.MM.YYYY"
                            allowClear={false}
                            suffixIcon={<CalendarOutlined />}
                            style={{ marginLeft: 12 }}
                            inputReadOnly
                            onChange={(date) => {
                              if (date && dayjs.isDayjs(date)) {
                                setWeekStart(date.startOf("isoWeek"));
                              }
                            }}
                          />
                          <Dropdown
                            menu={{
                              items: [
                                ...projects.map((p) => ({
                                  key: p.ID_Order,
                                  label: p.Order_Name,
                                  onClick: () =>
                                    setSelectedProjectId(p.ID_Order),
                                })),
                                { type: "divider" },
                                {
                                  key: "reset",
                                  label: "Сбросить фильтр",
                                  onClick: () => setSelectedProjectId(null),
                                },
                              ],
                            }}
                            placement="bottomRight"
                            arrow
                          >
                            <Button icon={<FilterOutlined />}>
                              {selectedProjectId
                                ? projects.find(
                                    (p) => p.ID_Order === selectedProjectId
                                  )?.Order_Name
                                : "Фильтр по проекту"}
                            </Button>
                          </Dropdown>
                        </div>
                      </div>

                      <div className="horizontal-columns">
                        {getWeekDays().map((day) => {
                          const dayKey = day.format("YYYY-MM-DD");
                          const entriesForDay = getFilteredEntriesByDay(day);
                          const isExpanded = expandedDays.includes(dayKey);
                          const entriesToShow = isExpanded
                            ? entriesForDay
                            : entriesForDay.slice(0, 4);

                          return (
                            <div
                              key={day.toString()}
                              className="horizontal-column"
                            >
                              <div className="day-header">
                                {weekDaysRu[day.isoWeekday() - 1]}
                              </div>
                              <div className="day-date">
                                {day.format("DD.MM")}
                              </div>
                              <div className="card-stack">
                                {entriesToShow.map((entry) => (
                                  <div
                                    key={entry.ID_Execution}
                                    className="entry-card"
                                  >
                                    <div>
                                      <b>{entry.Task_Name}</b>
                                      <div>Проект: {entry.Order_Name}</div>
                                      <div>
                                        Сотрудник: {entry.Employee_Name}
                                      </div>
                                      <div>{entry.Hours_Spent} ч</div>
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 8,
                                        display: "flex",
                                        justifyContent: "flex-start",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Tooltip title="Просмотр">
                                        <Button
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={() => {
                                            setViewingEntry(entry);
                                            setIsViewModalVisible(true);
                                          }}
                                        />
                                      </Tooltip>

                                      <Tooltip title="Комментарии">
                                        <Button
                                          size="small"
                                          icon={<MessageOutlined />}
                                          onClick={() =>
                                            notification.info({
                                              message: "Комментарии",
                                              description:
                                                "Переход на модуль комментариев в разработке",
                                            })
                                          }
                                        />
                                      </Tooltip>
                                    </div>
                                  </div>
                                ))}
                                {entriesForDay.length > 4 && (
                                  <Button
                                    size="small"
                                    style={{
                                      marginTop: "8px",
                                      width: "100%",
                                      backgroundColor: "#1f1f1f",
                                      color: "#f0f0f0",
                                      border: "1px solid #444",
                                    }}
                                    onClick={() => toggleDayExpansion(dayKey)}
                                  >
                                    {isExpanded
                                      ? "Свернуть"
                                      : `Смотреть ещё (${
                                          entriesForDay.length - 4
                                        })`}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ),
                },
                {
                  key: "table",
                  label: "Таблица",
                  children: (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          marginBottom: "16px",
                        }}
                      >
                        <Input
                          placeholder="Поиск задач..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ width: 250 }}
                        />
                      </div>

                      <Table
  dataSource={filteredEntries}
  rowKey="ID_Execution"
  pagination={{
    pageSize: 10,
    showSizeChanger: false, // Отключаем выбор размера страницы
  }}
                        columns={[
                          {
                            title: "Задача",
                            dataIndex: "Task_Name",
                            key: "task",
                          },
                          {
                            title: "Проект",
                            dataIndex: "Order_Name",
                            key: "order",
                          },
                          {
                            title: "Сотрудник",
                            dataIndex: "Employee_Name",
                            key: "employee",
                          },
                          {
                            title: "Начало",
                            dataIndex: "Start_Date",
                            key: "start",
                            render: (date: string) =>
                              dayjs(date).format("DD.MM.YYYY HH:mm"),
                          },
                          {
                            title: "Окончание",
                            dataIndex: "End_Date",
                            key: "end",
                            render: (date: string) =>
                              dayjs(date).format("DD.MM.YYYY HH:mm"),
                          },
                          {
                            title: "Потрачено (ч)",
                            dataIndex: "Hours_Spent",
                            key: "hours",
                          },
                          {
                            title: "Норма времени",
                            dataIndex: "Time_Norm",
                            key: "timeNorm",
                            render: (val) => (val ? `${val} ч` : "-"),
                          },
                          {
                            title: "Вложился в норму?",
                            dataIndex: "FitTimeNorm",
                            key: "fitTimeNorm",
                            render: (val) =>
                              val === undefined ? "-" : val ? "Да" : "Нет",
                          },
                        ]}
                      />
                    </>
                  ),
                },
              ]}
            />
            <Modal
              title="Просмотр записи"
              open={isViewModalVisible}
              onCancel={() => setIsViewModalVisible(false)}
              footer={[
                <Button
                  key="close"
                  onClick={() => setIsViewModalVisible(false)}
                >
                  Закрыть
                </Button>,
              ]}
            >
              {viewingEntry && (
                <div style={{ lineHeight: 1.8 }}>
                  <p>
                    <b>Задача:</b> {viewingEntry.Task_Name}
                  </p>
                  <p>
                    <b>Проект:</b> {viewingEntry.Order_Name}
                  </p>
                  <p>
                    <b>Сотрудник:</b> {viewingEntry.Employee_Name}
                  </p>
                  <p>
                    <b>Дата начала:</b>{" "}
                    {dayjs(viewingEntry.Start_Date).format("DD.MM.YYYY HH:mm")}
                  </p>
                  <p>
                    <b>Дата окончания:</b>{" "}
                    {dayjs(viewingEntry.End_Date).format("DD.MM.YYYY HH:mm")}
                  </p>
                  <p>
                    <b>Потрачено:</b> {viewingEntry.Hours_Spent} ч
                  </p>
                  <p>
                    <b>Норма времени:</b>{" "}
                    {viewingEntry.Time_Norm !== null &&
                    viewingEntry.Time_Norm !== undefined
                      ? `${viewingEntry.Time_Norm} ч`
                      : "-"}
                  </p>
                  <p>
                    <b>Вложился в норму:</b>{" "}
                    {viewingEntry.FitTimeNorm !== null &&
                    viewingEntry.FitTimeNorm !== undefined
                      ? viewingEntry.FitTimeNorm
                        ? "Да"
                        : "Нет"
                      : "-"}
                  </p>

                  {viewingEntry.Description && (
                    <p>
                      <b>Описание:</b> {viewingEntry.Description}
                    </p>
                  )}
                  {(viewingEntry.Attachments || []).length > 0 && (
                    <div>
                      <p>
                        <b>Вложения:</b>
                      </p>
                      <ul className="attachments-list">
                        {viewingEntry.Attachments!.map((file, idx) => (
                          <li key={`file-${idx}`}>
                            <a
                              href={`${API_URL}/uploads/${file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {file}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viewingEntry.link && (
                    <div>
                      <p>
                        <b>Ссылка:</b>{" "}
                        <a
                          href={viewingEntry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {viewingEntry.link}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default TimeTrackingManager;
