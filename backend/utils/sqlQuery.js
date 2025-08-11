export const createRoleQuery = `
    CREATE TYPE role_type AS
    ENUM('Manager', 'Developer', 'HR', 'Sales', 'Intern');
`;
export const createEmployeeTableQuery = `
    CREATE TABLE employee_details(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(50) NOT NULL UNIQUE,
        age SMALLINT NOT NULL CHECK (age > 17),
        role role_type NOT NULL DEFAULT 'Intern',
        salary DECIMAL(8,2) NOT NULL
);`;

export const getAllEmployeeQuery = `SELECT * FROM employee_details`;
