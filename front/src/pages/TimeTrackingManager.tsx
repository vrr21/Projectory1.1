import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Button, Select, DatePicker, Modal, App, Tooltip, notification
} from 'antd';
import {
  EyeOutlined, LeftOutlined, RightOutlined, CalendarOutlined
} from '@ant-design/icons';
import HeaderManager from '../components/HeaderManager';
import SidebarManager from '../components/SidebarManager';
import '../styles/pages/TimeTrackingEmployee.css';

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/ru';

dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale('ru');

const { Content } = Layout;
const API_URL = import.meta.env.VITE_API_URL;

interface RawTimeEntry {
  ID_Execution: string;
  ID_Task: string;
  ID_User: string;
  Task_Name: string;
  Order_Name: string;
  Start_Date: string;
  End_Date: string;
  Hours_Spent: number;
  Description?: string;
  Employee_Name: string;
  Team_Name: string;
}

interface Team {
  ID_Team: string;
  Team_Name: string;
}

interface User {
  ID_User: string;
  First_Name: string;
  Last_Name: string;
}

const TimeTrackingManager: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<RawTimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<RawTimeEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('isoWeek'));
  const [viewingEntry, setViewingEntry] = useState<RawTimeEntry | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [, contextHolder] = notification.useNotification();


  const weekDaysRu = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [entriesRes, teamsRes, usersRes] = await Promise.all([
      fetch(`${API_URL}/api/time-tracking`, { headers }),
      fetch(`${API_URL}/api/teams`, { headers }),
      fetch(`${API_URL}/api/employees`, { headers }),
    ]);

    const [entries, teamList, userList] = await Promise.all([
      entriesRes.json(),
      teamsRes.json(),
      usersRes.json()
    ]);

    setTimeEntries(entries);
    setTeams(teamList);
    setUsers(userList);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = timeEntries;

    if (selectedTeam) {
      filtered = filtered.filter(e => e.Team_Name === selectedTeam);
    }

    if (selectedUser) {
      filtered = filtered.filter(e => e.ID_User === selectedUser);
    }

    setFilteredEntries(filtered);
  }, [selectedTeam, selectedUser, timeEntries]);

  const getWeekDays = () =>
    Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

  const getEntriesByDay = (day: dayjs.Dayjs) =>
    filteredEntries.filter(entry => dayjs(entry.Start_Date).isSame(day, 'day'));

  return (
    <App>
      {contextHolder}
      <Layout className="layout">
        <SidebarManager />
        <Layout className="main-layout">
          <HeaderManager />
          <Content className="content">
            <div className="page-content">
              <div className="time-tracking-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: 0, flexBasis: '100%' }}>Учёт времени сотрудников</h1>

                <Select
                  allowClear
                  placeholder="Фильтр по команде"
                  style={{ width: 200 }}
                  onChange={(value) => setSelectedTeam(value)}
                >
                  {teams.map(team => (
                    <Select.Option key={team.ID_Team} value={team.Team_Name}>
                      {team.Team_Name}
                    </Select.Option>
                  ))}
                </Select>

                <Select
  allowClear
  placeholder="Фильтр по сотруднику"
  style={{ width: 200 }}
  onChange={(value) => setSelectedUser(value)}
>
  {users.map(u => (
    <Select.Option key={u.ID_User} value={u.ID_User}>
      {u.First_Name} {u.Last_Name}
    </Select.Option>
  ))}
</Select>


                <Button icon={<LeftOutlined />} onClick={() => setWeekStart(weekStart.subtract(1, 'week'))} />
                <h2 style={{ margin: '0 1rem' }}>
                  {weekStart.format('D MMMM')} – {weekStart.add(6, 'day').format('D MMMM YYYY')}
                </h2>
                <Button icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(1, 'week'))} />

                <DatePicker
                  value={weekStart}
                  format="DD.MM.YYYY"
                  allowClear={false}
                  suffixIcon={<CalendarOutlined />}
                  style={{ marginLeft: 12 }}
                  inputReadOnly
                  onChange={(date) => {
                    if (date && dayjs.isDayjs(date)) {
                      setWeekStart(date.startOf('isoWeek'));
                    }
                  }}
                  disabledDate={(current) =>
                    current && (current.year() < 2000 || current.year() > 2100)
                  }
                />
              </div>

              <div className="horizontal-columns">
                {getWeekDays().map(day => (
                  <div key={day.toString()} className="horizontal-column">
                    <div className="day-header">{weekDaysRu[day.isoWeekday() - 1]}</div>
                    <div className="day-date">{day.format('DD.MM')}</div>
                    <div className="card-stack">
                      {getEntriesByDay(day).map(entry => (
                        <div key={entry.ID_Execution} className="entry-card">
                          <b>{entry.Task_Name}</b>
                          <div>Проект: {entry.Order_Name}</div>
                          <div>Сотрудник: {entry.Employee_Name}</div>
                          <div>{entry.Hours_Spent} ч</div>
                          <div style={{ marginTop: 8 }}>
                            <Tooltip title="Просмотр">
                              <Button icon={<EyeOutlined />} onClick={() => { setViewingEntry(entry); setIsViewModalVisible(true); }} />
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Modal
                title="Просмотр записи"
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={<Button onClick={() => setIsViewModalVisible(false)}>Закрыть</Button>}
              >
                {viewingEntry && (
                  <div style={{ lineHeight: 1.8 }}>
                    <p><b>Задача:</b> {viewingEntry.Task_Name}</p>
                    <p><b>Проект:</b> {viewingEntry.Order_Name}</p>
                    <p><b>Сотрудник:</b> {viewingEntry.Employee_Name}</p>
                    <p><b>Дата начала:</b> {dayjs(viewingEntry.Start_Date).format('DD.MM.YYYY HH:mm')}</p>
                    <p><b>Дата окончания:</b> {dayjs(viewingEntry.End_Date).format('DD.MM.YYYY HH:mm')}</p>
                    <p><b>Потрачено:</b> {viewingEntry.Hours_Spent} ч</p>
                    {viewingEntry.Description && <p><b>Описание:</b> {viewingEntry.Description}</p>}
                  </div>
                )}
              </Modal>
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
};

export default TimeTrackingManager;
