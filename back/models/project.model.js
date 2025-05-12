const { pool, sql, poolConnect } = require('../config/db');

class ProjectModel {
  /**
   * Получить все проекты с привязкой к команде и типу проекта
   */
  static async getAll() {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT 
        o.ID_Order,
        o.Order_Name,
        pt.Type_Name,
        o.Creation_Date,
        o.End_Date,
        o.Status,
        o.ID_Team,
        t.Team_Name
      FROM Orders o
      LEFT JOIN ProjectTypes pt ON o.ID_ProjectType = pt.ID_ProjectType
      LEFT JOIN Teams t ON o.ID_Team = t.ID_Team
    `);
    return result.recordset;
  }

  /**
   * Создать проект
   */
  static async create({ Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team }) {
    await poolConnect;

    // Проверка и получение ID типа проекта
    let typeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType = typeResult.recordset.length > 0
      ? typeResult.recordset[0].ID_ProjectType
      : (await pool.request()
          .input('typeName', sql.NVarChar, Type_Name)
          .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)')
        ).recordset[0].ID_ProjectType;

    await pool.request()
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .query(`
        INSERT INTO Orders (Order_Name, ID_ProjectType, Creation_Date, End_Date, Status, ID_Team)
        VALUES (@Order_Name, @ID_ProjectType, @Creation_Date, @End_Date, @Status, @ID_Team)
      `);
  }

  /**
   * Обновить проект
   */
  static async update(id, { Order_Name, Type_Name, Creation_Date, End_Date, Status, ID_Team }) {
    await poolConnect;

    let typeResult = await pool.request()
      .input('typeName', sql.NVarChar, Type_Name)
      .query('SELECT ID_ProjectType FROM ProjectTypes WHERE Type_Name = @typeName');

    let ID_ProjectType = typeResult.recordset.length > 0
      ? typeResult.recordset[0].ID_ProjectType
      : (await pool.request()
          .input('typeName', sql.NVarChar, Type_Name)
          .query('INSERT INTO ProjectTypes (Type_Name) OUTPUT INSERTED.ID_ProjectType VALUES (@typeName)')
        ).recordset[0].ID_ProjectType;

    await pool.request()
      .input('ID_Order', sql.Int, id)
      .input('Order_Name', sql.NVarChar, Order_Name)
      .input('ID_ProjectType', sql.Int, ID_ProjectType)
      .input('Creation_Date', sql.Date, Creation_Date)
      .input('End_Date', sql.Date, End_Date || null)
      .input('Status', sql.NVarChar, Status)
      .input('ID_Team', sql.Int, ID_Team)
      .query(`
        UPDATE Orders
        SET Order_Name = @Order_Name,
            ID_ProjectType = @ID_ProjectType,
            Creation_Date = @Creation_Date,
            End_Date = @End_Date,
            Status = @Status,
            ID_Team = @ID_Team
        WHERE ID_Order = @ID_Order
      `);
  }

  /**
   * Удалить проект
   */
  static async delete(id) {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query('DELETE FROM Orders WHERE ID_Order = @ID_Order');
  }

  /**
   * Закрыть проект (изменить статус на Завершён)
   */
  static async close(id) {
    await poolConnect;
    await pool.request()
      .input('ID_Order', sql.Int, id)
      .query("UPDATE Orders SET Status = 'Завершён' WHERE ID_Order = @ID_Order");
  }

  /**
   * Поиск проектов по названию
   */
  static async search(query) {
    await poolConnect;
    const result = await pool.request()
      .input('query', sql.NVarChar, `%${query}%`)
      .query('SELECT ID_Order, Order_Name FROM Orders WHERE Order_Name LIKE @query');
    return result.recordset;
  }
}

module.exports = ProjectModel;
