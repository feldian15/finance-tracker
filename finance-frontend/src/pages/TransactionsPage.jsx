import TransactionsSection from "../components/Transactions/TransactionsSection"

function TransactionsPage(props) {

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