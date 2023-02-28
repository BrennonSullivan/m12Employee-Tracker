//dependencies required
const mysql = require("mysql2");
const inquirer = require("inquirer");
require("console.table");
//const sql = require("./sql");

//mysql connection
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: process.env.MYSQL_PASSWORD,
    database: 'employeesDB'
});

connection.connect(function (err) {
    if (err) throw err;
    console.log("connected as id " + connection.threadId);
    console.log(`
    ╔═══╗─────╔╗──────────────╔═╗╔═╗
    ║╔══╝─────║║──────────────║║╚╝║║
    ║╚══╦╗╔╦══╣║╔══╦╗─╔╦══╦══╗║╔╗╔╗╠══╦═╗╔══╦══╦══╦═╗
    ║╔══╣╚╝║╔╗║║║╔╗║║─║║║═╣║═╣║║║║║║╔╗║╔╗╣╔╗║╔╗║║═╣╔╝
    ║╚══╣║║║╚╝║╚╣╚╝║╚═╝║║═╣║═╣║║║║║║╔╗║║║║╔╗║╚╝║║═╣║
    ╚═══╩╩╩╣╔═╩═╩══╩═╗╔╩══╩══╝╚╝╚╝╚╩╝╚╩╝╚╩╝╚╩═╗╠══╩╝
    ───────║║──────╔═╝║─────────────────────╔═╝║
    ───────╚╝──────╚══╝─────────────────────╚══╝`)
    // runs the app
    firstPrompt();
});

// function which prompts the user for what action they should take
function firstPrompt() {

  inquirer
    .prompt({
      type: "list",
      name: "task",
      message: "What would you like to do?",
      choices: [
        "View all Departments",
        "View all Roles",
        "View all Employees",
        "View Employees by Manager",
        "View Employees by Department",
        "Add a Department",
        "Add a Role",
        "Add an Employee",
        "Update an Employee Role",
        "Update Employee Manager",
        "Delete Department",
        "Delete Role",
        "Delete Employee",
        "Quit"
      ]
    })
    .then(function ({ task }) {
      switch (task) {
        case "View all Departments":
          viewDepartments();
          break;
        case "View all Roles":
          viewRoles();
          break;
        case "View all Employees":
          viewEmployees();
          break;
        case "View Employees by Manager":
          viewEmployeesByManager();
          break;
        case "View Employees by Department":
          viewEmployeeByDepartment();
          break;
        case "Add a Department":
          addDepartment();
          break;        
        case "Add a Role":
          addRole();
          break;        
        case "Add an Employee":
          addEmployee();
          break;        
        case "Update an Employee Role":
          updateRole();
          break;
        case "Update Employee Manager":
          updateEmployeeManager();
          break;
        case "Delete Department":
          deleteDepartment();
          break;
        case "Delete Role":
          deleteRole();
          break;
        case "Delete Employee":
          deleteEmployee()
          break;
        case "Quit":
          connection.end();
          process.exit();
          break;
      }
    });
}

//View Employees/ READ all, SELECT * FROM
function viewDepartments() {
  console.log("Viewing Departments\n");

  let query =
    `SELECT id, name
    FROM department;;`

  connection.query(query, function (err, res) {
    if (err) throw err;

    console.table(res);
    console.log("Departments viewed!\n");

    firstPrompt();
  });
}

function viewRoles() {
  console.log("Viewing Roles\n");

  var query =
    `SELECT role.id, role.title, role.salary, department.name AS department 
    FROM role 
    JOIN department ON role.department_id = department.id;
    `

  connection.query(query, function (err, res) {
    if (err) throw err;

    console.table(res);
    console.log("Roles viewed!\n");

    firstPrompt();
  });
}

function viewEmployees() {
  console.log("Viewing Employees\n");

  var query =
    `SELECT e.id, e.first_name, e.last_name, r.title AS job_title, d.name AS department, r.salary, 
    CONCAT(m.first_name, ' ', m.last_name) AS manager_name 
    FROM employee e 
    LEFT JOIN employee m ON e.manager_id = m.id 
    JOIN role r ON e.role_id = r.id 
    JOIN department d ON r.department_id = d.id;
    `

  connection.query(query, function (err, res) {
    if (err) throw err;

    console.table(res);
    console.log("Employees viewed!\n");

    firstPrompt();
  });
}

//"View Employees by Department" / READ by, SELECT * FROM
// Make a department array
function viewEmployeeByDepartment() {
  console.log("Viewing employees by department\n");

  var query =
    `SELECT d.id, d.name, SUM(r.salary) AS budget
    FROM employee e
    LEFT JOIN role r
      ON e.role_id = r.id
    LEFT JOIN department d
    ON d.id = r.department_id
    GROUP BY d.id, d.name
    `

  connection.query(query, function (err, res) {
    if (err) throw err;

    const departmentChoices = res.map(data => ({
      value: data.id, name: data.name
    }));

    console.table(res);
    console.log("Department view succeed!\n");

    promptDepartment(departmentChoices);
  });
}
function viewEmployeesByManager() {
  console.log("Viewing employees by manager\n");

  // Step 1: select employees and their managers
  const query =
    `SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, 
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM employee e
     LEFT JOIN employee m ON e.manager_id = m.id`;

  connection.query(query, function (err, res) {
    if (err) throw err;

    // Step 2: create an array of managers to use as choices in the prompt
    const managerChoices = res
      .filter(employee => employee.manager_name !== null) // exclude employees without managers
      .reduce((choices, employee) => {
        // add the manager to the choices if it hasn't been added yet
        if (!choices.some(choice => choice.value === employee.manager_name)) {
          choices.push({ value: employee.manager_name, name: employee.manager_name });
        }
        return choices;
      }, []);

    inquirer
      .prompt([
        {
          type: "list",
          name: "managerName",
          message: "Which manager would you like to see employees for?",
          choices: managerChoices
        }
      ])
      .then(function (answer) {
        console.log("Viewing employees for manager", answer.managerName);

        // Step 3: select all employees with the selected manager
        const query =
          `SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, 
                  r.title, d.name AS department
           FROM employee e
           JOIN role r ON e.role_id = r.id
           JOIN department d ON r.department_id = d.id
           WHERE e.manager_id = (
             SELECT id FROM employee WHERE CONCAT(first_name, ' ', last_name) = ?
           )`;

        connection.query(query, answer.managerName, function (err, res) {
          if (err) throw err;

          console.table("response ", res);
          console.log(res.affectedRows + " employees are viewed!\n");

          firstPrompt();
        });
      });
  });
}

// User choose the department list, then employees pop up
function promptDepartment(departmentChoices) {

  inquirer
    .prompt([
      {
        type: "list",
        name: "departmentId",
        message: "Which department would you choose?",
        choices: departmentChoices
      }
    ])
    .then(function (answer) {
      console.log("answer ", answer.departmentId);

      var query =
        `SELECT e.id, e.first_name, e.last_name, r.title, d.name AS department 
  FROM employee e
  JOIN role r
	ON e.role_id = r.id
  JOIN department d
  ON d.id = r.department_id
  WHERE d.id = ?`

      connection.query(query, answer.departmentId, function (err, res) {
        if (err) throw err;

        console.table("response ", res);
        console.log(res.affectedRows + "Employees are viewed!\n");

        firstPrompt();
      });
    });
}

function addDepartment() {
  promptAddDepartment();
}

function promptAddDepartment() {
  inquirer
    .prompt([
      {
        type: "input",
        name: "departmentName",
        message: "Department name?"
      },
    ])
    .then(function (answer) {

      var query = `INSERT INTO department SET ?`

      connection.query(query, {
        name: answer.departmentName
      },
        function (err, res) {
          if (err) throw err;

          console.table(res);
          console.log("Department Inserted!");

          firstPrompt();
        });
    });
}

//"Add Role" / CREATE: INSERT INTO
function addRole() {

  var query =
    `SELECT d.id, d.name, SUM(r.salary) AS budget
    FROM employee e
    JOIN role r ON e.role_id = r.id
    JOIN department d ON d.id = r.department_id
    GROUP BY d.id, d.name;
    `

  connection.query(query, function (err, res) {
    if (err) throw err;

    // (callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any)
    const departmentChoices = res.map(({ id, name }) => ({
      value: id, name: `${id} ${name}`
    }));

    console.table(res);
    console.log("Department array!");

    promptAddRole(departmentChoices);
  });
}

function promptAddRole(departmentChoices) {

  inquirer
    .prompt([
      {
        type: "input",
        name: "roleTitle",
        message: "Role title?"
      },
      {
        type: "input",
        name: "roleSalary",
        message: "Role Salary"
      },
      {
        type: "list",
        name: "departmentId",
        message: "Department?",
        choices: departmentChoices
      },
    ])
    .then(function (answer) {

      var query = `INSERT INTO role SET ?`

      connection.query(query, {
        title: answer.roleTitle,
        salary: answer.roleSalary,
        department_id: answer.departmentId      
      },
        function (err, res) {
          if (err) throw err;

          console.table(res);
          console.log("Role Inserted!");

          firstPrompt();
        });
    });
}

// Make a employee array
function addEmployee() {
  console.log("Inserting an employee!")

  var query =
    `SELECT r.id, r.title, r.salary 
      FROM role r`

  connection.query(query, function (err, res) {
    if (err) throw err;

    const roleChoices = res.map(({ id, title, salary }) => ({
      value: id, title: `${title}`, salary: `${salary}`
    }));

    console.table(res);
    console.log("RoleToInsert!");

    promptInsert(roleChoices);
  });
}

function promptInsert(roleChoices) {

  inquirer
    .prompt([
      {
        type: "input",
        name: "first_name",
        message: "What is the employee's first name?"
      },
      {
        type: "input",
        name: "last_name",
        message: "What is the employee's last name?"
      },
      {
        type: "list",
        name: "roleId",
        message: "What is the employee's role?",
        choices: roleChoices
      },
    ])
    .then(function (answer) {
      console.log(answer);

      var query = `INSERT INTO employee SET ?`
      // when finished prompting, insert a new item into the db with that info
      connection.query(query,
        {
          first_name: answer.first_name,
          last_name: answer.last_name,
          role_id: answer.roleId,
          manager_id: answer.managerId,
        },
        function (err, res) {
          if (err) throw err;

          console.table(res);
          console.log(res.insertedRows + "Inserted successfully!\n");

          firstPrompt();
        });
    });
}


//"Update Employee Role" / UPDATE,
function updateRole() { 
  employeeArray();

}

function employeeArray() {
  console.log("Updating an employee");

  var query =
    `SELECT e.id, e.first_name, e.last_name, r.title, d.name AS department, r.salary, CONCAT(m.first_name, ' ', m.last_name) AS manager
  FROM employee e
  JOIN role r
	ON e.role_id = r.id
  JOIN department d
  ON d.id = r.department_id
  JOIN employee m
	ON m.id = e.manager_id`

  connection.query(query, function (err, res) {
    if (err) throw err;

    const employeeChoices = res.map(({ id, first_name, last_name }) => ({
      value: id, name: `${first_name} ${last_name}`      
    }));

    console.table(res);
    console.log("employeeArray To Update!\n")

    roleArray(employeeChoices);
  });
}

function roleArray(employeeChoices) {
  console.log("Updating an role");

  var query =
    `SELECT r.id, r.title, r.salary 
  FROM role r`
  let roleChoices;

  connection.query(query, function (err, res) {
    if (err) throw err;

    roleChoices = res.map(({ id, title, salary }) => ({
      value: id, title: `${title}`, salary: `${salary}`      
    }));

    console.table(res);
    console.log("roleArray to Update!\n")

    promptEmployeeRole(employeeChoices, roleChoices);
  });
}

function promptEmployeeRole(employeeChoices, roleChoices) {

  inquirer
    .prompt([
      {
        type: "list",
        name: "employeeId",
        message: "Which employee do you want to set with the role?",
        choices: employeeChoices
      },
      {
        type: "list",
        name: "roleId",
        message: "Which role do you want to update?",
        choices: roleChoices
      },
    ])
    .then(function (answer) {

      var query = `UPDATE employee SET role_id = ? WHERE id = ?`
      // when finished prompting, insert a new item into the db with that info
      connection.query(query,
        [ answer.roleId,  
          answer.employeeId
        ],
        function (err, res) {
          if (err) throw err;

          console.table(res);
          console.log(res.affectedRows + "Updated successfully!");

          firstPrompt();
        });
    });
}

function updateEmployeeManager() {
  // Retrieve all employees
  const query = "SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM employee";
  connection.query(query, function(err, results) {
    if (err) throw err;

    // Prompt the user to select an employee to update
    inquirer.prompt([
      {
        type: "list",
        name: "employeeId",
        message: "Select the employee to update",
        choices: results.map(employee => ({ name: employee.name, value: employee.id }))
      }
    ]).then(function(answer) {
      const employeeId = answer.employeeId;

      // Retrieve all other employees (excluding the selected employee)
      const otherEmployees = results.filter(employee => employee.id !== employeeId);
      inquirer.prompt([
        {
          type: "list",
          name: "newManagerId",
          message: "Select the new manager",
          choices: otherEmployees.map(employee => ({ name: employee.name, value: employee.id }))
        }
      ]).then(function(answer) {
        const newManagerId = answer.newManagerId;

        // Update the selected employee's manager_id
        const updateQuery = "UPDATE employee SET manager_id = ? WHERE id = ?";
        connection.query(updateQuery, [newManagerId, employeeId], function(err, results) {
          if (err) throw err;

          console.log("Employee manager updated!");
          firstPrompt();
        });
      });
    });
  });
}

// Delete department
function deleteDepartment() {
  console.log("Deleting a department\n");

  var query =
    `SELECT d.id, d.name, COUNT(r.id) AS role_count
  FROM department d
  LEFT JOIN role r
    ON d.id = r.department_id
  GROUP BY d.id, d.name`;

  connection.query(query, function (err, res) {
    if (err) throw err;

    const departmentChoices = res.map(data => ({
      value: data.id, name: `${data.name} (${data.role_count} roles)`
    }));

    inquirer
      .prompt([
        {
          type: "list",
          name: "departmentId",
          message: "Which department would you like to remove?",
          choices: departmentChoices
        }
      ])
      .then(function (answer) {
        var query = `DELETE FROM department WHERE id = ?`;
        connection.query(query, answer.departmentId, function (err, res) {
          if (err) throw err;

          console.log(res.affectedRows + " department deleted!\n");

          // Show updated department list
          viewDepartments();
        });
      });
  });
}

// Delete role
function deleteRole() {
  console.log("Deleting a role\n");

  var query =
    `SELECT r.id, r.title, r.salary, d.name AS department
  FROM role r
  LEFT JOIN department d
    ON r.department_id = d.id`;

  connection.query(query, function (err, res) {
    if (err) throw err;

    const roleChoices = res.map(data => ({
      value: data.id,
      name: `${data.title} (${data.salary}) (${data.department})`
    }));

    inquirer
      .prompt([
        {
          type: "list",
          name: "roleId",
          message: "Which role would you like to remove?",
          choices: roleChoices
        }
      ])
      .then(function (answer) {
        var query = `DELETE FROM role WHERE id = ?`;
        connection.query(query, answer.roleId, function (err, res) {
          if (err) throw err;

          console.log(res.affectedRows + " role deleted!\n");

          // Show updated role list
          viewRoles();
        });
      });
  });
}

// Delete employee
function deleteEmployee() {
  console.log("Deleting an employee\n");

  var query =
    `SELECT e.id, e.first_name, e.last_name
  FROM employee e`;

  connection.query(query, function (err, res) {
    if (err) throw err;

    const employeeChoices = res.map(data => ({
      value: data.id,
      name: `${data.first_name} ${data.last_name}`
    }));

    inquirer
      .prompt([
        {
          type: "list",
          name: "employeeId",
          message: "Which employee would you like to remove?",
          choices: employeeChoices
        }
      ])
      .then(function (answer) {
        var query = `DELETE FROM employee WHERE id = ?`;
        connection.query(query, answer.employeeId, function (err, res) {
          if (err) throw err;

          console.log(res.affectedRows + " employee deleted!\n");

          // Show updated employee list
          viewEmployees();
        });
      });
  });
}
