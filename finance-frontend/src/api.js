const API_BASE = "http://127.0.0.1:8000"

export async function createAccount(account) {

    const response = await fetch(
        `${API_BASE}/accounts`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(account)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to create account")
    }

    return response.json()
}


export async function updateAccount(
    accountId,
    updates
) {

    const response = await fetch(
        `${API_BASE}/accounts/${accountId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updates)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to update account")
    }

    return response.json()
}

export async function fetchAccounts() {

    const response = await fetch(
        `${API_BASE}/accounts`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch accounts")
    }

    return response.json()
}

export async function fetchAccountBalance(accountId) {

    const response = await fetch(
        `${API_BASE}/accounts/${accountId}/balance`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch balance")
    }

    return response.json()
}

export async function createTransaction(data) {

    const response = await fetch(
        `${API_BASE}/transactions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to create transaction")
    }

    return response.json()
}


export async function fetchTransactions(filters = {}) {
    const params = new URLSearchParams()

    if (filters.minAmount) {
        params.append("min_amount", filters.minAmount)
    }

    if (filters.maxAmount) {
        params.append("max_amount", filters.maxAmount)
    }

    if (filters.startDate) {
        params.append("start_date", filters.startDate)
    }
    
    if (filters.endDate) {
        params.append("end_date", filters.endDate)
    }

    if (filters.transactionType) {
        params.append("transaction_type", filters.transactionType)
    }

    if (filters.categoryId) {
        params.append("category_id", filters.categoryId)
    }

    if (filters.accountId) {
        params.append("account_id", filters.accountId)
    }

    if (filters.descriptionSearch) {
        params.append("description", filters.descriptionSearch)
    }

    const response = await fetch(
        `${API_BASE}/transactions?${params.toString()}`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch transactions")
    }

    return response.json()
}


export async function fetchCategories() {

    const response = await fetch(
        `${API_BASE}/categories`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch categories")
    }

    return response.json()
}


export async function updateTransaction(
    transactionId,
    updates
) {

    const response = await fetch(
        `${API_BASE}/transactions/${transactionId}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(updates)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to update transaction")
    }

    return response.json()
}

export async function createCategory(category) {

    const response = await fetch(
        `${API_BASE}/categories`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(category)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to create category")
    }

    return response.json()
}


export async function updateCategory(
    categoryId,
    updates
) {

    const response = await fetch(
        `${API_BASE}/categories/${categoryId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updates)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to update category")
    }

    return response.json()
}

export async function fetchRules() {

    const response = await fetch(
        `${API_BASE}/rules`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch rules")
    }

    return response.json()
}


export async function createRule(rule) {

    const response = await fetch(
        `${API_BASE}/rules`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(rule)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to create rule")
    }

    return response.json()
}


export async function updateRule(
    ruleId,
    updates
) {

    const response = await fetch(
        `${API_BASE}/rules/${ruleId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updates)
        }
    )

    if (!response.ok) {
        throw new Error("Failed to update rule")
    }

    return response.json()
}

export async function deleteTransaction(id) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
        method: "DELETE"
    })

    if (!res.ok) {
        throw new Error("Failed to delete transaction")
    }

    return res.json()
}

export async function deleteAccount(id) {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: "DELETE"
    })

    if (!res.ok) {
        throw new Error("Failed to delete account")
    }

    return res.json()
}

export async function deleteCategory(id) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: "DELETE"
    })

    if (!res.ok) {
        throw new Error("Failed to delete category")
    }

    return res.json()
}

export async function deleteRule(id) {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
        method: "DELETE"
    })

    if (!res.ok) {
        throw new Error("Failed to delete rule")
    }

    return res.json()
}


export async function importTransactions(
    file,
    accountId
) {

    const formData = new FormData()

    formData.append("file", file)

    formData.append(
        "account_id",
        accountId
    )

    const response = await fetch(
        `${API_BASE}/upload-csv`,
        {
            method: "POST",
            body: formData
        }
    )

    if (!response.ok) {
        throw new Error("CSV upload failed")
    }

    return response.json()
}


export async function fetchUncategorizedTransactions() {

    const response = await fetch(
        `${API_BASE}/transactions/uncategorized`
    )

    if (!response.ok) {
        throw new Error(
            "Failed to fetch uncategorized transactions"
        )
    }

    return response.json()
}


export async function reapplyRules() {

    const response = await fetch(
        `${API_BASE}/rules/reapply`,
        {
            method: "POST"
        }
    )

    if (!response.ok) {
        throw new Error(
            "Failed to reapply rules"
        )
    }

    return response.json()
}


export async function fetchSpendingSummary() {

    const res = await fetch(
        `${API_BASE}/dashboard/spending-summary`
    )

    if (!res.ok) {
        throw new Error("Failed to fetch spending summary")
    }

    return res.json()
}


export async function fetchDashboardSummary() {
    const response = await fetch(
        `${API_BASE}/dashboard/summary`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch dashboard summary")
    }

    return response.json();
}


export async function fetchDashboardDynamicSummary(
    start_date,
    end_date
) {
    const params = new URLSearchParams()

    if (start_date) {
        params.append(
            "start_date",
            start_date
        )
    }

    if (end_date) {
        params.append(
            "end_date",
            end_date
        )
    }

    const response = await fetch(
        `${API_BASE}/dashboard/dynamic_summary?${params}`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch dashboard summary")
    }

    return response.json();
}


export async function fetchCategorySpending(
    start_date,
    end_date
) {
    const params = new URLSearchParams()

    if (start_date) {
        params.append(
            "start_date",
            start_date
        )
    }

    if (end_date) {
        params.append(
            "end_date",
            end_date
        )
    }

    const response = await fetch(
        `${API_BASE}/dashboard/category_spending?${params}`
    )

    if (!response.ok) {
        throw new Error("failed to fetch category spending")
    }

    return response.json();
}


export async function createLinkToken() {
    const response = await fetch(`${API_BASE}/api/create_link_token`);

    if (!response.ok) {
        throw new Error("Failed to create link token")
    }

    return response.json();
}


export async function exchangePublicToken(publicToken) {
    const response = await fetch(`${API_BASE}/api/exchange_public_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ public_token: publicToken }),
    });

    if (!response.ok){
        throw new Error("Failed to exchange public token")
    }

    return response.json();
}


export async function syncTransactions(itemId) {
    const response = await fetch(`${API_BASE}/api/sync_transactions/${itemId}`, {
        method: "POST",
    })

    if (!response.ok) {
        throw new Error("Failed to sync transactions")
    }

    return response.json()
}