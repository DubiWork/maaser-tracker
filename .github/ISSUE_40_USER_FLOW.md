# Issue #40: Migration User Flow Diagram

**Date:** 2026-03-04
**Purpose:** Visual representation of all migration decision points and flows
**Format:** Mermaid diagrams (renders on GitHub)

---

## Complete Migration Flow

```mermaid
flowchart TD
    Start([User Signs In<br/>for First Time]) --> CheckMigration{Migration<br/>Already Done?}

    CheckMigration -->|Yes| SkipMigration[Skip Migration<br/>Use Firestore Data]
    CheckMigration -->|No| CheckEntries{Has Local<br/>IndexedDB Entries?}

    CheckEntries -->|No| NoMigration[No Migration Needed<br/>Start Fresh in Firestore]
    CheckEntries -->|Yes| Delay[3-Second Delay<br/>App Loads]

    Delay --> ConsentDialog[Show Consent Dialog<br/>GDPR Article 6]

    ConsentDialog --> UserChoice{User<br/>Decision?}

    UserChoice -->|Decline| Declined[Migration Declined<br/>Stay Local-Only<br/>Log Event]
    UserChoice -->|Accept| CheckDataset{Entry<br/>Count?}

    CheckDataset -->|< 250| StartMigration[Start Migration<br/>No Warning]
    CheckDataset -->|≥ 250| ShowWarning[Show Large Dataset Warning<br/>Estimated Time/Size]

    ShowWarning --> WarningChoice{User<br/>Choice?}
    WarningChoice -->|Sync Now| StartMigration
    WarningChoice -->|Wait WiFi| DeferMigration[Defer to Next Session<br/>Check WiFi Status]
    WarningChoice -->|Cancel| Declined

    StartMigration --> MigrateLoop[Batch Migration Loop<br/>500 entries/batch]

    MigrateLoop --> CheckDuplicate{Entry<br/>Exists in<br/>Firestore?}

    CheckDuplicate -->|No| WriteFresh[Write to Firestore<br/>Create New Entry]
    CheckDuplicate -->|Yes| CompareTimes{Compare<br/>Timestamps}

    CompareTimes -->|Local Newer| WriteLocal[Update Firestore<br/>Last-Write-Wins]
    CompareTimes -->|Firestore Newer| SkipEntry[Skip Entry<br/>Firestore Wins]
    CompareTimes -->|Equal| SkipEntry

    WriteFresh --> UpdateProgress[Update Progress<br/>{completed}/{total}]
    WriteLocal --> UpdateProgress
    SkipEntry --> UpdateProgress

    UpdateProgress --> CheckCancel{User Clicked<br/>Cancel?}

    CheckCancel -->|Yes| CancelFlow[Stop Migration<br/>Delete Partial Data<br/>Log Cancellation]
    CheckCancel -->|No| CheckMore{More<br/>Entries?}

    CheckMore -->|Yes| CheckNetwork{Network<br/>OK?}
    CheckMore -->|No| MigrationSuccess[Migration Success!<br/>Mark Complete in Firestore]

    CheckNetwork -->|Yes| MigrateLoop
    CheckNetwork -->|No| NetworkError[Network Error<br/>Pause Migration]

    NetworkError --> RetryChoice{Retry<br/>Strategy}
    RetryChoice -->|Auto Retry| WaitBackoff[Wait with<br/>Exponential Backoff]
    RetryChoice -->|Max Retries| PartialFail[Partial Migration<br/>Log Failed Entries]

    WaitBackoff --> CheckNetwork

    MigrationSuccess --> SetBackup[Set IndexedDB to<br/>Read-Only Backup<br/>90-Day Retention]

    SetBackup --> ShowSuccess[Show Success Dialog<br/>🎉 Celebration<br/>CEO Addition]

    CancelFlow --> CancelConfirm[Show Cancellation<br/>Confirmation<br/>Data Stays Local]

    PartialFail --> ShowPartial[Show Partial Success<br/>Success Count + Failed Count]

    ShowSuccess --> Done([User Can Access<br/>Data from Any Device])
    CancelConfirm --> LocalOnly([User Stays<br/>Local-Only Mode])
    ShowPartial --> PartialDone([Some Data Synced<br/>Some Local-Only])
    Declined --> LocalOnly
    NoMigration --> Done
    SkipMigration --> Done

    style Start fill:#90EE90
    style Done fill:#90EE90
    style LocalOnly fill:#FFD700
    style PartialDone fill:#FFD700
    style CancelFlow fill:#FF6B6B
    style NetworkError fill:#FF6B6B
    style MigrationSuccess fill:#4CAF50
```

---

## Happy Path (Simplified)

```mermaid
flowchart LR
    A[Sign In] --> B[3s Delay]
    B --> C[Consent Dialog]
    C --> D[Accept]
    D --> E[Migrate Data]
    E --> F[Success! 🎉]
    F --> G[90-Day Backup]

    style A fill:#90EE90
    style F fill:#4CAF50
    style G fill:#87CEEB
```

---

## Large Dataset Path

```mermaid
flowchart TD
    Start[Sign In] --> Consent[Show Consent Dialog]
    Consent --> Accept[User Accepts]
    Accept --> CheckCount{Entry Count<br/>≥ 250?}

    CheckCount -->|No| DirectStart[Start Migration<br/>Immediately]
    CheckCount -->|Yes| Warning[Show Warning Dialog<br/>Estimated Time/Size<br/>WiFi Recommendation]

    Warning --> Choice{User<br/>Choice?}

    Choice -->|Sync Now| DirectStart
    Choice -->|Wait WiFi| Defer[Defer to Next Session<br/>Check WiFi Monitor]
    Choice -->|Cancel| Cancel[Cancel<br/>Stay Local]

    DirectStart --> Migrate[Migration Process]
    Defer --> WaitWiFi[Wait for WiFi<br/>Connection Event]

    WaitWiFi --> NextSession[Next App Launch<br/>Auto-Check WiFi]
    NextSession --> CheckWiFi{WiFi<br/>Available?}

    CheckWiFi -->|Yes| AutoStart[Auto-Start Migration<br/>No Dialog]
    CheckWiFi -->|No| WaitMore[Wait for WiFi]

    AutoStart --> Migrate
    WaitMore --> NextSession

    Migrate --> Success[Migration Success]

    style Warning fill:#FFA500
    style Success fill:#4CAF50
    style Cancel fill:#FF6B6B
```

---

## Cancellation Flow

```mermaid
flowchart TD
    Start[Migration Running] --> Progress[Show Progress Dialog<br/>with Cancel Button]
    Progress --> UserCancel{User Clicks<br/>Cancel?}

    UserCancel -->|No| Continue[Continue Migration]
    UserCancel -->|Yes| ConfirmCancel{Confirm<br/>Cancellation?}

    ConfirmCancel -->|No| Continue
    ConfirmCancel -->|Yes| StopNow[Stop Migration<br/>Immediately]

    StopNow --> DeletePartial[Delete Partial<br/>Firestore Data<br/>GDPR Article 17]

    DeletePartial --> RevertMode[Set Migration<br/>Status: Cancelled]

    RevertMode --> LogEvent[Log Audit Event<br/>GDPR Article 5]

    LogEvent --> ShowConfirm[Show Confirmation<br/>Data Stays Local]

    ShowConfirm --> LocalMode[User in Local-Only Mode<br/>Can Retry from Settings]

    Continue --> CheckComplete{Migration<br/>Complete?}
    CheckComplete -->|No| Progress
    CheckComplete -->|Yes| Success[Migration Success]

    style StopNow fill:#FF6B6B
    style DeletePartial fill:#FF6B6B
    style Success fill:#4CAF50
    style LocalMode fill:#FFD700
```

---

## Error Handling Flow

```mermaid
flowchart TD
    Start[Migration Running] --> TryBatch[Try Batch<br/>Write 500 Entries]

    TryBatch --> Error{Error<br/>Occurred?}

    Error -->|No| NextBatch[Next Batch]
    Error -->|Yes| ErrorType{Error<br/>Type?}

    ErrorType -->|Network| NetworkFlow[Network Error Handler]
    ErrorType -->|Quota| QuotaFlow[Quota Error Handler]
    ErrorType -->|Auth| AuthFlow[Auth Error Handler]
    ErrorType -->|Unknown| UnknownFlow[Unknown Error Handler]

    NetworkFlow --> RetryCount{Retry<br/>Count < 3?}
    RetryCount -->|Yes| Backoff[Exponential Backoff<br/>2^retry seconds]
    RetryCount -->|No| GiveUp[Give Up<br/>Mark Partial Failure]

    Backoff --> Wait[Wait...]
    Wait --> CheckConn{Connection<br/>Restored?}

    CheckConn -->|Yes| TryBatch
    CheckConn -->|No| Backoff

    QuotaFlow --> ShowQuota[Show Quota Error<br/>Try in 1 Hour]
    ShowQuota --> DeferHour[Defer to<br/>Background Job]

    AuthFlow --> ShowAuth[Show Auth Error<br/>Sign In Again]
    ShowAuth --> WaitAuth[Wait for<br/>Re-Authentication]

    WaitAuth --> Reauth{User<br/>Re-Authenticated?}
    Reauth -->|Yes| TryBatch
    Reauth -->|No| GiveUp

    UnknownFlow --> ShowUnknown[Show Generic Error<br/>Data is Safe]
    ShowUnknown --> OfferRetry{User Wants<br/>Retry?}

    OfferRetry -->|Yes| TryBatch
    OfferRetry -->|No| GiveUp

    GiveUp --> LogFailed[Log Failed Entries<br/>Store Locally]
    LogFailed --> PartialSuccess[Show Partial Success<br/>Success + Failed Counts]

    NextBatch --> CheckMore{More<br/>Batches?}
    CheckMore -->|Yes| TryBatch
    CheckMore -->|No| Complete[Migration Complete]

    style Complete fill:#4CAF50
    style GiveUp fill:#FF6B6B
    style PartialSuccess fill:#FFD700
```

---

## Manual Trigger Flow (Settings)

```mermaid
flowchart TD
    Start[User Opens Settings] --> NavSync[Navigate to<br/>Data & Sync Section]

    NavSync --> ShowButton[Show Sync to Cloud Button]

    ShowButton --> CheckStatus{Migration<br/>Already Done?}

    CheckStatus -->|Yes| DisableButton[Button Disabled<br/>Already Synced ✓]
    CheckStatus -->|No| EnableButton[Button Enabled<br/>Tap to Sync]

    EnableButton --> UserTap{User<br/>Taps Button?}

    UserTap -->|No| StaySettings[Stay in Settings]
    UserTap -->|Yes| CheckEntries{Has Local<br/>Entries?}

    CheckEntries -->|No| NoData[Show Info<br/>No Data to Sync]
    CheckEntries -->|Yes| ConfirmDialog[Show Confirmation<br/>{count} Entries<br/>Mobile Data Warning]

    ConfirmDialog --> UserConfirm{User<br/>Confirms?}

    UserConfirm -->|No| StaySettings
    UserConfirm -->|Yes| StartManual[Start Migration<br/>Manual Trigger]

    StartManual --> ShowProgress[Show Progress Dialog<br/>Can Cancel]

    ShowProgress --> MigrationFlow[Standard Migration Flow<br/>See Main Diagram]

    MigrationFlow --> Result{Result?}

    Result -->|Success| ShowSuccess[Show Success Toast<br/>Return to Settings]
    Result -->|Failed| ShowError[Show Error<br/>Offer Retry]
    Result -->|Cancelled| ShowCancel[Show Cancellation<br/>Return to Settings]

    ShowSuccess --> UpdateUI[Update Settings UI<br/>Button Disabled]
    ShowError --> StaySettings
    ShowCancel --> StaySettings

    style StartManual fill:#4169E1
    style ShowSuccess fill:#4CAF50
    style ShowError fill:#FF6B6B
```

---

## 90-Day Backup Cleanup Flow

```mermaid
flowchart TD
    Start[Migration Complete] --> SetBackup[Set IndexedDB<br/>Read-Only Mode<br/>deleteAfter = +90 days]

    SetBackup --> Schedule[Schedule Background<br/>Cleanup Job]

    Schedule --> Wait[Wait 90 Days...]

    Wait --> CheckDay{90 Days<br/>Passed?}

    CheckDay -->|No| Wait
    CheckDay -->|Yes| LaunchApp[Next App Launch]

    LaunchApp --> ShowPrompt[Show Cleanup Prompt<br/>Backup is 90 Days Old]

    ShowPrompt --> UserChoice{User<br/>Choice?}

    UserChoice -->|Delete| ConfirmDelete{Confirm<br/>Deletion?}
    UserChoice -->|Keep 30 More| Extend[Extend deleteAfter<br/>+30 Days]

    ConfirmDelete -->|No| Extend
    ConfirmDelete -->|Yes| DeleteNow[Delete IndexedDB<br/>Clear All Local Data]

    DeleteNow --> LogDelete[Log Security Event<br/>BACKUP_DELETED]

    LogDelete --> Done[Cleanup Complete<br/>Firestore Only]

    Extend --> ExtendLog[Log Extension<br/>BACKUP_EXTENDED]

    ExtendLog --> NewWait[Wait 30 More Days...]

    NewWait --> CheckDay

    style DeleteNow fill:#FF6B6B
    style Done fill:#4CAF50
    style Extend fill:#87CEEB
```

---

## Decision Points Summary

| Decision Point | Options | Default | Can Change |
|----------------|---------|---------|------------|
| **Migration Timing** | Immediate / Delayed | Delayed (3s) | No |
| **User Consent** | Accept / Decline | - | User Choice |
| **Large Dataset Warning** | Sync Now / Wait WiFi / Cancel | - | User Choice |
| **During Migration** | Continue / Cancel | Continue | User Choice |
| **Network Error** | Auto Retry / Give Up | Auto Retry (3x) | No |
| **Duplicate Handling** | Last-Write-Wins / Manual | Last-Write-Wins | No |
| **IndexedDB Retention** | Keep 90 Days / Delete Now | Keep 90 Days | User Choice |
| **Backup Cleanup** | Delete / Extend 30 Days | - | User Choice |
| **Manual Trigger** | Available / Not Available | Available | No |

---

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> NotStarted: First Sign-In
    NotStarted --> ConsentPending: Show Dialog
    ConsentPending --> InProgress: User Accepts
    ConsentPending --> Declined: User Declines
    InProgress --> Paused: Network Error
    InProgress --> Cancelled: User Cancels
    InProgress --> Completed: Success
    InProgress --> PartiallyCompleted: Partial Success
    Paused --> InProgress: Connection Restored
    Paused --> Cancelled: Max Retries
    Declined --> NotStarted: Can Retry from Settings
    Cancelled --> NotStarted: Can Retry from Settings
    PartiallyCompleted --> [*]: Some Data Local
    Completed --> BackupRetention: 90-Day Timer Starts
    BackupRetention --> CleanedUp: Backup Deleted
    CleanedUp --> [*]
    Completed --> [*]: If Backup Kept
```

---

## Implementation Notes

### Rendering on GitHub
These Mermaid diagrams will render automatically in GitHub Issues and Pull Requests. To view locally:
1. Install Mermaid Live Editor extension in VS Code, or
2. Use https://mermaid.live/ to preview

### Updating the Diagram
If business logic changes:
1. Update this file
2. Reference in Issue #40
3. Keep synchronized with implementation

### Color Legend
- 🟢 Green: Success states
- 🔴 Red: Error/cancellation states
- 🟡 Yellow: Partial/intermediate states
- 🔵 Blue: User action required
- ⚪ White: Process steps

---

**Created:** 2026-03-04
**For:** Issue #40 - IndexedDB to Firestore Migration
**Gap:** User flow diagram (LOW priority)
**Status:** Ready for developer reference
