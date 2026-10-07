import { useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import TransactionsSection from "../components/Transactions/TransactionsSection"

function TransactionsPage(props) {
    const location = useLocation()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const categoryFromQuery = searchParams.get("categoryId") || ""

        if (!categoryFromQuery) {
            return
        }

        if (props.categoryId !== categoryFromQuery) {
            props.setCategoryId(categoryFromQuery)
        }
    }, [searchParams, props.categoryId, props.setCategoryId])

    return (
        <div>
            <h1>Transactions</h1>

            <TransactionsSection
                {...props}
            />
        </div>
    )
}

export default TransactionsPage