import AccountsSection from "../components/Accounts/AccountsSection"

function AccountsPage(props) {

    return (
        <div>

            <h1>Accounts</h1>

            <AccountsSection
                {...props}
            />

        </div>
    )
}

export default AccountsPage