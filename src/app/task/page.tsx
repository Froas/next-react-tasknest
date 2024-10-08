"use client";

import { withAuth } from '../../hoc/withAuth'
const Task = () => {
    return (
        <>
            <div>
                Task page
            </div>
        </>
    )
}

export default withAuth(Task);
