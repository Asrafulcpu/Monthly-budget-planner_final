// API Service
class ApiService {
  static async getTransactions() {
    const response = await fetch('/api/transactions');
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return await response.json();
  }

  static async addTransaction(transaction) {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction)
    });
    if (!response.ok) {
      throw new Error('Failed to add transaction');
    }
    return await response.json();
  }

  static async deleteTransaction(id) {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete transaction');
    }
  }

  static async getCategories() {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return await response.json();
  }

  static async addCategory(category) {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category)
    });
    if (!response.ok) {
      throw new Error('Failed to add category');
    }
    return await response.json();
  }
}

// Main Application
const budgetApp = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactions: [],
  categories: [],
  incomeCategories: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'],
  expenseCategories: ['Food & Groceries', 'Housing', 'Transportation', 'Utilities', 'Shopping', 'Entertainment'],
  spendingChart: null,
  expenseChart: null,

  init: async function() {
    this.setCurrentDate();
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    try {
      await this.loadData();
      this.setupEventListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize application. Please try again later.');
    }
  },

  loadData: async function() {
    try {
      const [transactions, categories] = await Promise.all([
        ApiService.getTransactions(),
        ApiService.getCategories()
      ]);
      
      this.transactions = transactions;
      this.categories = categories;
      
      this.loadTransactions();
      this.loadCategories();
      this.updateSummary();
      this.initCharts();
    } catch (error) {
      console.error('Data loading error:', error);
      throw error;
    }
  },

  setCurrentDate: function() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
    document.getElementById('currentMonth').textContent = 
      `${monthNames[this.currentMonth]} ${this.currentYear}`;
  },

  loadTransactions: async function() {
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = '';
    
    try {
      // Filter transactions for current month/year
      const filteredTransactions = this.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === this.currentMonth && 
              transactionDate.getFullYear() === this.currentYear;
      });
      
      if (filteredTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions found</td></tr>';
        return;
      }
      
      // Sort by date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      filteredTransactions.forEach(transaction => {
        tbody.innerHTML += `
          <tr>
            <td>${this.formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td><span class="transaction-category">${transaction.category}</span></td>
            <td class="transaction-amount ${transaction.type}">
              ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
            </td>
            <td class="transaction-actions">
              <button title="Edit" onclick="budgetApp.editTransaction(${transaction.id})"><i class="fas fa-edit"></i></button>
              <button title="Delete" onclick="budgetApp.deleteTransaction(${transaction.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Failed to load transactions</td></tr>';
    }
  },

  loadCategories: function() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    
    // Calculate spent amounts for each category
    this.calculateCategorySpending();
    
    if (this.categories.length === 0) {
      grid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1;">No categories found</div>';
      return;
    }
    
    this.categories.forEach(category => {
      let percentage = Math.round((category.spent / category.budget) * 100);
      if (category.budget === 0) percentage = 0;
      
      grid.innerHTML += `
        <div class="category-card">
          <div class="category-info">
            <div class="category-icon"><i class="fas fa-${category.icon}"></i></div>
            <div>
              <div class="category-name">${category.name}</div>
              <small>$${category.spent.toFixed(2)} / $${category.budget.toFixed(2)}</small>
            </div>
          </div>
          <div class="category-amount">
  ${percentage}%
  <button class="delete-category-btn" title="Delete Category" onclick="budgetApp.deleteCategory('${category.name}')">
    <i class="fas fa-trash"></i>
  </button>
</div>

        </div>
      `;
    });
  },

  calculateCategorySpending: function() {
    // Reset all spent amounts to 0
    this.categories.forEach(category => {
      category.spent = 0;
    });
    
    // Calculate spent amounts for current month
    this.transactions
      .filter(t => t.type === 'expense' && 
                  new Date(t.date).getMonth() === this.currentMonth &&
                  new Date(t.date).getFullYear() === this.currentYear)
      .forEach(transaction => {
        const category = this.categories.find(c => c.name === transaction.category);
        if (category) {
          category.spent += transaction.amount;
        }
      });
  },

  updateSummary: function() {
    const filteredTransactions = this.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === this.currentMonth && 
            transactionDate.getFullYear() === this.currentYear;
    });
    
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    
    document.getElementById('incomeTotal').textContent = '$' + income.toFixed(2);
    document.getElementById('expenseTotal').textContent = '$' + expenses.toFixed(2);
    document.getElementById('balanceTotal').textContent = '$' + balance.toFixed(2);
    
    // Update progress bars
    document.getElementById('incomeProgress').style.width = 
      Math.min(100, income / 5000 * 100) + '%';
    document.getElementById('expenseProgress').style.width = 
      Math.min(100, expenses / 3000 * 100) + '%';
    document.getElementById('balanceProgress').style.width = 
      Math.min(100, (balance + 2000) / 4000 * 100) + '%';
  },

  initCharts: function() {
    this.updateCharts();
  },

  updateCharts: function() {
    // Monthly Spending Chart
    const monthlyData = this.getMonthlySpendingData();
    
    if (this.spendingChart) {
      this.spendingChart.destroy();
    }
    
    this.spendingChart = new Chart(
      document.getElementById('spendingChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Income',
              data: monthlyData.income,
              backgroundColor: '#4caf50'
            },
            {
              label: 'Expenses',
              data: monthlyData.expenses,
              backgroundColor: '#f44336'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      }
    );
    
    // Expense Breakdown Chart
    const expenseData = this.getExpenseBreakdownData();
    
    if (this.expenseChart) {
      this.expenseChart.destroy();
    }
    
    this.expenseChart = new Chart(
      document.getElementById('expenseChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: expenseData.labels,
          datasets: [{
            data: expenseData.amounts,
            backgroundColor: [
              '#4caf50', '#2196f3', '#ff9800', '#9c27b0', 
              '#607d8b', '#e91e63', '#00bcd4', '#8bc34a'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      }
    );
  },

  getMonthlySpendingData: function() {
    const incomeData = new Array(12).fill(0);
    const expenseData = new Array(12).fill(0);
    
    this.transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      if (date.getFullYear() === this.currentYear) {
        if (transaction.type === 'income') {
          incomeData[date.getMonth()] += transaction.amount;
        } else {
          expenseData[date.getMonth()] += transaction.amount;
        }
      }
    });
    
    return {
      income: incomeData,
      expenses: expenseData
    };
  },

  getExpenseBreakdownData: function() {
    const categoryMap = {};
    
    // Initialize with all categories
    this.categories.forEach(category => {
      categoryMap[category.name] = 0;
    });
    
    // Sum expenses for current month
    this.transactions
      .filter(t => t.type === 'expense' && 
                  new Date(t.date).getMonth() === this.currentMonth &&
                  new Date(t.date).getFullYear() === this.currentYear)
      .forEach(transaction => {
        if (categoryMap[transaction.category] !== undefined) {
          categoryMap[transaction.category] += transaction.amount;
        }
      });
    
    // Filter out categories with 0 spending
    const labels = [];
    const amounts = [];
    
    Object.keys(categoryMap).forEach(category => {
      if (categoryMap[category] > 0) {
        labels.push(category);
        amounts.push(categoryMap[category]);
      }
    });
    
    return { labels, amounts };
  },

  addTransaction: async function(transaction) {
    const btn = document.querySelector('#transactionForm button[type="submit"]');
    const btnText = btn.querySelector('.btn-text');
    const originalText = btnText.textContent;
    
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading"></span> Processing...';
    
    try {
      const newTransaction = await ApiService.addTransaction(transaction);
      this.transactions.push(newTransaction);
      this.loadTransactions();
      this.updateSummary();
      this.updateCharts();
      document.getElementById('transactionModal').style.display = 'none';
    } catch (error) {
      console.error('Error adding transaction:', error);
      this.showError('Failed to add transaction. Please try again.', 'transactionForm');
    } finally {
      btn.disabled = false;
      btnText.textContent = originalText;
    }
  },

  deleteTransaction: async function(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await ApiService.deleteTransaction(id);
      this.transactions = this.transactions.filter(t => t.id !== id);
      this.loadTransactions();
      this.updateSummary();
      this.updateCharts();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      this.showError('Failed to delete transaction. Please try again.');
    }
  },

  editTransaction: function(id) {
    // Implementation for editing a transaction
    alert('Edit functionality would be implemented here');
  },

  addCategory: async function(category) {
    const btn = document.querySelector('#categoryForm button[type="submit"]');
    const btnText = btn.querySelector('.btn-text');
    const originalText = btnText.textContent;
    
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading"></span> Processing...';
    
    try {
      const newCategory = await ApiService.addCategory(category);
      this.categories.push(newCategory);
      this.loadCategories();
      this.updateCharts();
      document.getElementById('categoryModal').style.display = 'none';
    } catch (error) {
      console.error('Error adding category:', error);
      this.showError('Failed to add category. Please try again.', 'categoryForm');
    } finally {
      btn.disabled = false;
      btnText.textContent = originalText;
    }
  },
deleteCategory: function(categoryName) {
  if (!confirm(`Are you sure you want to delete the category "${categoryName}"?`)) return;

  this.categories = this.categories.filter(c => c.name !== categoryName);

  // Optional: Also remove matching transactions
  this.transactions = this.transactions.filter(t => t.category !== categoryName);

  // Save updated categories and transactions
  const updatedDB = {
    transactions: this.transactions,
    categories: this.categories
  };

  fetch('/api/update-db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedDB)
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update database');
    this.loadCategories();
    this.loadTransactions();
    this.updateSummary();
    this.updateCharts();
  })
  .catch(error => {
    console.error('Error deleting category:', error);
    this.showError('Failed to delete category. Please try again.');
  });
},

  showError: function(message, formId = null) {
    if (formId) {
      // Clear all error messages first
      document.querySelectorAll(`#${formId} .error-message`).forEach(el => {
        el.style.display = 'none';
      });
      
      // Show a generic error message
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-message';
      errorContainer.style.display = 'block';
      errorContainer.textContent = message;
      
      const form = document.getElementById(formId);
      form.insertBefore(errorContainer, form.lastElementChild);
    } else {
      alert(message);
    }
  },

  formatDate: function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  setupEventListeners: function() {
    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
      this.setCurrentDate();
      this.loadTransactions();
      this.loadCategories();
      this.updateSummary();
      this.updateCharts();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
      this.setCurrentDate();
      this.loadTransactions();
      this.loadCategories();
      this.updateSummary();
      this.updateCharts();
    });

    // Transaction modal
    document.getElementById('addTransactionBtn').addEventListener('click', () => {
      document.getElementById('transactionModal').style.display = 'block';
      document.getElementById('transactionDate').valueAsDate = new Date();
    });

    // Category modal
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      document.getElementById('categoryModal').style.display = 'block';
    });

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
      });
    });

    // Click outside modal to close
    window.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
      }
    });

    // Transaction form submission
    document.getElementById('transactionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('#transactionForm .error-message').forEach(el => {
        el.style.display = 'none';
      });
      
      // Validate form
      const date = document.getElementById('transactionDate').value;
      const description = document.getElementById('transactionDescription').value;
      const type = document.getElementById('transactionType').value;
      const category = document.getElementById('transactionCategory').value;
      const amount = document.getElementById('transactionAmount').value;
      
      let isValid = true;
      
      if (!date) {
        document.getElementById('dateError').textContent = 'Date is required';
        document.getElementById('dateError').style.display = 'block';
        isValid = false;
      }
      
      if (!description) {
        document.getElementById('descriptionError').textContent = 'Description is required';
        document.getElementById('descriptionError').style.display = 'block';
        isValid = false;
      }
      
      if (!type) {
        document.getElementById('typeError').textContent = 'Type is required';
        document.getElementById('typeError').style.display = 'block';
        isValid = false;
      }
      
      if (!category) {
        document.getElementById('categoryError').textContent = 'Category is required';
        document.getElementById('categoryError').style.display = 'block';
        isValid = false;
      }
      
      if (!amount || parseFloat(amount) <= 0) {
        document.getElementById('amountError').textContent = 'Valid amount is required';
        document.getElementById('amountError').style.display = 'block';
        isValid = false;
      }
      
      if (!isValid) return;
      
      const transaction = {
        date,
        description,
        type,
        category,
        amount: parseFloat(amount)
      };
      
      await this.addTransaction(transaction);
      e.target.reset();
    });

    // Category form submission
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous errors
      document.querySelectorAll('#categoryForm .error-message').forEach(el => {
        el.style.display = 'none';
      });
      
      // Validate form
      const name = document.getElementById('categoryName').value;
      const icon = document.getElementById('categoryIcon').value;
      const budget = document.getElementById('categoryBudget').value;
      
      let isValid = true;
      
      if (!name) {
        document.getElementById('categoryNameError').textContent = 'Name is required';
        document.getElementById('categoryNameError').style.display = 'block';
        isValid = false;
      }
      
      if (!budget || parseFloat(budget) <= 0) {
        document.getElementById('budgetError').textContent = 'Valid budget amount is required';
        document.getElementById('budgetError').style.display = 'block';
        isValid = false;
      }
      
      if (!isValid) return;
      
      const category = {
        name,
        icon,
        budget: parseFloat(budget)
      };
      
      await this.addCategory(category);
      e.target.reset();
    });

    // Update category dropdown when type changes
    document.getElementById('transactionType').addEventListener('change', (e) => {
      const type = e.target.value;
      const categorySelect = document.getElementById('transactionCategory');
      categorySelect.innerHTML = '<option value="">Select Category</option>';
      
      if (type === 'income') {
        this.incomeCategories.forEach(category => {
          categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
        });
      } else if (type === 'expense') {
        this.expenseCategories.forEach(category => {
          categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
        });
      }
    });

    // Filter button
    document.getElementById('filterBtn').addEventListener('click', () => {
      alert('Filter functionality would be implemented here');
    });
  }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  budgetApp.init();
});