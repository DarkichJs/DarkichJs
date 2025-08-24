# Telegram Message Receiver - Usage Guide

## Overview
The `Telegram_receiveMessage.xaml` file implements a UiPath workflow for receiving Telegram messages with support for waiting for messages after a specific message ID.

## Input Parameters
- **afterMessageID** (String, Optional): The ID of the message after which to start capturing. If provided (e.g., "287"), the receiver will wait for the first message with an ID greater than this value (e.g., 288).
- **telegramClient** (Object, Optional): The Telegram client object for API communication.

## Output Parameters
- **lastMessage** (String): The text content of the captured message.

## Functionality

### Core Features
1. **Message ID Comparison**: Safely converts message IDs to integers for proper numerical comparison
2. **Dual-Loop Architecture**: 
   - Outer polling loop for continuous message checking
   - Inner processing loop for handling received messages
3. **Clean Termination**: Properly exits both loops when target message is found
4. **Comprehensive Logging**: Detailed console output for debugging and monitoring

### Behavior Scenarios

#### Scenario 1: With afterMessageID
```
Input: afterMessageID = "287"
Behavior: Waits for first message with ID > 287
Example: Captures message ID 288 with text "First message after trigger"
```

#### Scenario 2: Without afterMessageID
```
Input: afterMessageID = "" (empty or null)
Behavior: Captures the very first message received
Example: Captures message ID 286 with text "Previous message"
```

#### Scenario 3: No Matching Message
```
Input: afterMessageID = "289" (when no messages exist after this ID)
Behavior: Continues polling, logs "No matching message found"
Result: lastMessage remains empty
```

## Implementation Details

### Message Processing Logic
```vb
If String.IsNullOrEmpty(afterMessageID) Then
    ' Capture first message
    lastMessage = messageText
    messageFound = True
    shouldStop = True
ElseIf messageID > targetAfterID Then
    ' Capture first message after specified ID
    lastMessage = messageText
    messageFound = True
    shouldStop = True
End If
```

### Loop Termination Strategy
- Uses `shouldStop` flag to coordinate between loops
- `Exit For` terminates inner message processing loop
- `Exit While` terminates outer polling loop
- Ensures clean shutdown without hanging processes

### Error Handling
- Try-catch block around polling logic
- Continues polling on exceptions (configurable)
- Comprehensive logging of errors and status

## Testing
The implementation has been validated with test cases covering:
- ✅ Finding messages after specific ID (287 → finds 288)
- ✅ Capturing first message when no ID specified
- ✅ Handling cases with no matching messages
- ✅ Proper loop termination and logging
- ✅ Integer conversion and comparison

## Integration Notes
- Designed for UiPath Studio
- Compatible with .NET Framework workflows
- Requires System.Activities and Microsoft.VisualBasic assemblies
- Sample message structure can be replaced with actual Telegram API calls