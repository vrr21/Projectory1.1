import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export interface Task {
  ID_Task: number;
  Task_Name: string;
  Description: string;
  Status_Name: string;
  Order_Name: string;
  ProjectType: string;
  Start_Date: string | null;
  End_Date: string | null;
  Time_Norm: number; 
}


export const fetchEmployeeTasks = async (): Promise<Task[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/tasks/employee-tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
