import { useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import TransactionsSection from "../components/Transactions/TransactionsSection"

function TransactionsPage({
    categoryId,
    setCategoryId,
    setMinAmount,
    setMaxAmount,
    setStartDate,
    setEndDate,
    setTransactionType,
    setAccountId,
    setDescriptionSearch,
    setNeedsReview,
    loadTransactions,
    ...props
}) {
    const [searchParams] = useSearchParams()
    const loadedCategoryRef = useRef("")
    const categoryFromQuery = searchParams.get("categoryId") || ""

    useEffect(() => {
        if (!categoryFromQuery) {
            return
        }

        if (loadedCategoryRef.current === categoryFromQuery) {
            return
        }

        loadedCategoryRef.current = categoryFromQuery
        setMinAmount("")
        setMaxAmount("")
        setStartDate("")
        setEndDate("")
        setTransactionType("")
        setCategoryId(categoryFromQuery)
        setAccountId("")
        setDescriptionSearch("")
        setNeedsReview(null)

        loadTransactions(
            { categoryId: categoryFromQuery },
            { ignoreDraftFilters: true }
        )
    }, [
        categoryFromQuery,
        setCategoryId,
        setMinAmount,
        setMaxAmount,
        setStartDate,
        setEndDate,
        setTransactionType,
        setAccountId,
        setDescriptionSearch,
        setNeedsReview,
        loadTransactions
    ])

    return (
        <div className="transactions-page">
            <TransactionsSection
                {...props}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                setMinAmount={setMinAmount}
                setMaxAmount={setMaxAmount}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                setTransactionType={setTransactionType}
                setAccountId={setAccountId}
                setDescriptionSearch={setDescriptionSearch}
                setNeedsReview={setNeedsReview}
                loadTransactions={loadTransactions}
                drilldownCategoryId={categoryFromQuery}
            />
        </div>
    )
}

export default TransactionsPage
