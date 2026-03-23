resource "google_monitoring_dashboard" "nexus_overview" {
  dashboard_json = jsonencode({
    displayName = "Nexus Platform Overview"
    mosaicLayout = {
      columns = 12
      tiles = concat(
        local.api_gateway_tiles,
        local.llm_router_tiles,
        local.orchestrator_tiles,
        local.skill_registry_tiles,
        local.memory_tiles,
        local.billing_tiles,
      )
    }
  })
}

locals {
  project_id = var.project_id

  # ------------------------------------------------------------------
  # API Gateway tiles
  # ------------------------------------------------------------------
  api_gateway_tiles = [
    {
      yPos  = 0
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## API Gateway"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 1
      xPos   = 0
      width  = 4
      height = 4
      widget = {
        title = "Request Count"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_count\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 1
      xPos   = 4
      width  = 4
      height = 4
      widget = {
        title = "Latency p50 / p95 / p99"
        xyChart = {
          dataSets = [
            {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_latencies\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_50"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
              plotType = "LINE"
            },
            {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_latencies\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
              plotType = "LINE"
            },
            {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_latencies\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_99"
                    crossSeriesReducer = "REDUCE_MEAN"
                  }
                }
              }
              plotType = "LINE"
            },
          ]
        }
      }
    },
    {
      yPos   = 1
      xPos   = 8
      width  = 4
      height = 4
      widget = {
        title = "Error Rate (5xx)"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 5
      xPos   = 0
      width  = 4
      height = 4
      widget = {
        title = "Active Connections"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"api-gateway\" AND metric.type=\"run.googleapis.com/container/instance_count\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
  ]

  # ------------------------------------------------------------------
  # LLM Router tiles
  # ------------------------------------------------------------------
  llm_router_tiles = [
    {
      yPos  = 9
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## LLM Router"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 10
      xPos   = 0
      width  = 4
      height = 4
      widget = {
        title = "Request Count by Provider"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"llm-router\" AND metric.type=\"run.googleapis.com/request_count\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_RATE"
                  crossSeriesReducer = "REDUCE_SUM"
                  groupByFields      = ["metric.labels.response_code"]
                }
              }
            }
            plotType = "STACKED_BAR"
          }]
        }
      }
    },
    {
      yPos   = 10
      xPos   = 4
      width  = 4
      height = 4
      widget = {
        title = "LLM Latency"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"llm-router\" AND metric.type=\"run.googleapis.com/request_latencies\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_PERCENTILE_95"
                  crossSeriesReducer = "REDUCE_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 10
      xPos   = 8
      width  = 4
      height = 4
      widget = {
        title = "Token Usage (custom metric)"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"llm-router\" AND metric.type=\"custom.googleapis.com/llm/token_count\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_RATE"
                  crossSeriesReducer = "REDUCE_SUM"
                  groupByFields      = ["metric.labels.model"]
                }
              }
            }
            plotType = "STACKED_BAR"
          }]
        }
      }
    },
  ]

  # ------------------------------------------------------------------
  # Orchestrator tiles
  # ------------------------------------------------------------------
  orchestrator_tiles = [
    {
      yPos  = 14
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## Orchestrator"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 15
      xPos   = 0
      width  = 4
      height = 4
      widget = {
        title = "Active Sessions"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orchestrator\" AND metric.type=\"custom.googleapis.com/orchestrator/active_sessions\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 15
      xPos   = 4
      width  = 4
      height = 4
      widget = {
        title = "Session Duration (avg)"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orchestrator\" AND metric.type=\"custom.googleapis.com/orchestrator/session_duration\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_PERCENTILE_95"
                  crossSeriesReducer = "REDUCE_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 15
      xPos   = 8
      width  = 4
      height = 4
      widget = {
        title = "Orchestrator Error Rate"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orchestrator\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
  ]

  # ------------------------------------------------------------------
  # Skill Registry tiles
  # ------------------------------------------------------------------
  skill_registry_tiles = [
    {
      yPos  = 19
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## Skill Registry"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 20
      xPos   = 0
      width  = 6
      height = 4
      widget = {
        title = "Skill Operations Count"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"skill-registry\" AND metric.type=\"run.googleapis.com/request_count\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_RATE"
                  crossSeriesReducer = "REDUCE_SUM"
                  groupByFields      = ["metric.labels.response_code"]
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 20
      xPos   = 6
      width  = 6
      height = 4
      widget = {
        title = "Skill Registry Latency"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"skill-registry\" AND metric.type=\"run.googleapis.com/request_latencies\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_PERCENTILE_95"
                  crossSeriesReducer = "REDUCE_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
  ]

  # ------------------------------------------------------------------
  # Memory (Redis + Firestore) tiles
  # ------------------------------------------------------------------
  memory_tiles = [
    {
      yPos  = 24
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## Memory (Redis & Firestore)"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 25
      xPos   = 0
      width  = 4
      height = 4
      widget = {
        title = "Redis Memory Usage"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"redis_instance\" AND metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_MEAN"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 25
      xPos   = 4
      width  = 4
      height = 4
      widget = {
        title = "Firestore Document Reads"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"firestore_database\" AND metric.type=\"firestore.googleapis.com/document/read_count\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
    {
      yPos   = 25
      xPos   = 8
      width  = 4
      height = 4
      widget = {
        title = "Firestore Document Writes"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"firestore_database\" AND metric.type=\"firestore.googleapis.com/document/write_count\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
  ]

  # ------------------------------------------------------------------
  # Billing (Stripe) tiles
  # ------------------------------------------------------------------
  billing_tiles = [
    {
      yPos  = 29
      xPos  = 0
      width = 12
      height = 1
      widget = {
        title = ""
        text = {
          content = "## Billing"
          format  = "MARKDOWN"
        }
      }
    },
    {
      yPos   = 30
      xPos   = 0
      width  = 6
      height = 4
      widget = {
        title = "Stripe Webhook Events"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"billing\" AND metric.type=\"custom.googleapis.com/billing/stripe_webhook_count\""
                aggregation = {
                  alignmentPeriod    = "60s"
                  perSeriesAligner   = "ALIGN_RATE"
                  crossSeriesReducer = "REDUCE_SUM"
                  groupByFields      = ["metric.labels.event_type"]
                }
              }
            }
            plotType = "STACKED_BAR"
          }]
        }
      }
    },
    {
      yPos   = 30
      xPos   = 6
      width  = 6
      height = 4
      widget = {
        title = "Usage Metering (tokens billed)"
        xyChart = {
          dataSets = [{
            timeSeriesQuery = {
              timeSeriesFilter = {
                filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"billing\" AND metric.type=\"custom.googleapis.com/billing/usage_metering\""
                aggregation = {
                  alignmentPeriod  = "60s"
                  perSeriesAligner = "ALIGN_RATE"
                }
              }
            }
            plotType = "LINE"
          }]
        }
      }
    },
  ]
}
