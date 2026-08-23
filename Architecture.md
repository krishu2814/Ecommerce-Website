                              ┌─────────────────┐
                              │   API Gateway   │
                              └────────┬────────┘
                                       │
             ┌─────────────────────────┼────────────────────────┐
             │                         │                        │
             ▼                         ▼                        ▼
      Product Service            Order Service            Payment Service
             │                         │                        │
             │                         │                        │
             │                    ORDER_CREATED                 │
             │                         │                        │
             │                         ▼                        │
             │                  ┌───────────────┐               │
             │                  │   RabbitMQ    │◄──────────────┤
             │                  │ecommerce_events│              │
             │                  └───────┬───────┘               │
             │                          │                       │
             │                          ▼                       │
             │                  Inventory Service               │
             │                          │                       │
             │                    ┌─────┴─────┐                 │
             │                    │           │                 │
             │                    ▼           ▼                 │
             │               Inventory   Reservation            │
             │                  Model        Model               │
             │                    │           │                  │
             │                    └─────┬─────┘                  │
             │                          │                        │
             │                          ▼                        │
             │                       MongoDB                     │
             │                                                   │
             │                                                   │
             │              PAYMENT_SUCCESS                      │
             │◄─────────────────────┤                            │
             │                      │                            │
             │                      ▼                            │
             │               Order Service                       │
             │                      │                            │
             │                      │ ORDER_CONFIRMED            │
             │                      ▼                            │
             │                  RabbitMQ                         │
             │                      │                            │
             │             ┌────────┴────────┐                   │
             │             ▼                 ▼                   │
             │       Inventory Service   Cart Service            │
             │             │                 │                   │
             │             ▼                 ▼                   │
             │       Confirm Stock       Clear Cart              │
             │             │                                     │
             │             ▼                                     │
             │      Reservation CONFIRMED                        │
             │                                                   │
             └───────────────────────────────────────────────────┘
