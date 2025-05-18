| Item                                  | Why                                                                            |
| ------------------------------------- |------------------------------------------------------------------------------------------------|
| **Projection failure metrics**        | Emit metric on `catch` blocks so you can track “events not projected” counts.                  |
| **Read model drift detection**        | Schema validation between event payload and projection logic (optional, helps with evolution). |
| **Command-scoped projection tagging** | Link projections back to causation command ID for full trace maps.                             |
| **RLS Policy Generator**              | Use core slice access model to auto-generate Supabase RLS. (You mentioned this is next anyway.) |

---

* event upcasting,
* boilerplate(s)?
* snapshot upcasting tests,
* observability, wire prometheus (infra api) / spans 
* Client SDK (+ stream with local pg notify as a tool, conform with supabase real time api + bring up a command interface)
* Example App, use SDK