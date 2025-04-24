const UploadAction = Object.freeze({
    COMMIT: "COMMIT",
    COLLAB_REQ: "COLLAB_REQUEST"
})

const CollabReqStatus = Object.freeze({
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    PENDING: "pending",
})
export { UploadAction, CollabReqStatus}