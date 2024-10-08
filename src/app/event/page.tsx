"use client";

import { withAuth } from '../../hoc/withAuth'
const Event = () => {
    return (
        <>
            <div>
                Event page
            </div>
        </>
    )
}

export default withAuth(Event);
