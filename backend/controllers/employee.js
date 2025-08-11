import { query } from "../utils/connectToDB.js";
import {
  createRoleQuery,
  createEmployeeTableQuery,
  getAllEmployeeQuery,
} from "../utils/sqlQuery.js";
import { createError } from "../utils/error.js";

export async function getAllEmployees(req, res, next) {
  try {
    const response = await query(`
            SELECT to_regclass('employee_details');
            `);
    console.log(response);
    if (!response.rows[0].to_regclass) {
      await query(createRoleQuery);
      await query(createEmployeeTableQuery);
    }
    const { rows } = await query(getAllEmployeeQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.log(error.message);
    return next(createError(400, "Couldn't get employee details!"));
  }
}
export async function getEmployee(req, res, next) {}
export async function deleteEmployee(req, res, next) {}
export async function updateEmployee(req, res, next) {}
export async function createEmployee(req, res, next) {}
