"use client";

import { withAuth } from '../../hoc/withAuth'
const Todo = () => {
    return (
        <>
            <div>
                Todo page
            </div>
        </>
    )
}

export default withAuth(Todo);
