import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const optionKey = "option";
    let contractNameR = Math.floor(Math.random() * 99999) + "RCon4RequestsTests";
    let contractNameW = Math.floor(Math.random() * 99999) + "WCon4RequestsTests";
    let wContractId, rContractId, tokenId, policyId, hederaId, rConractUuid, wConractUuid;
    let waitForApproveApplicationBlockId, deviceGridBlockId, issueRequestGridBlockId, approveRegistrantBtnBlockId;

    describe("Reject", () => {

        before("Create contracts, policy and register new user", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wConractUuid = response.body.id;
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    policyId = response.body.at(0).id;
                })
                //Get token(Irec token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                    })

                    Authorization.getAccessToken(SRUsername).then((authorization) => {
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.ContractPermissions + API.Users + UserUsername + "/" + API.Policies + API.Assign,
                            body: {
                                policyIds: [
                                    policyId
                                ],
                                assign: true
                            },
                            headers: {
                                authorization
                            },
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        })
                    })
                })
            })
        })

        before("Get blocks for waiting(approve app, device grid, issue grid) and token id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint token", () => {
            //Choose role
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field1: {},
                            field2: {},
                            field3: {}
                        },
                        ref: null
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let applicationData
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {

                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let deviceBody
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

                    //Create issue and wait while it in progress
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: {
                            document: {
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: UserUsername,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let issueRow
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {

                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }

                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Set pool", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileRetireRequestCreating(wContractId, requestForRetireRequestCreationProgress, 0)
            })
        })

        let wipeRequestId

        it("Reject wipe contract requests without auth token - Negative", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.DELETE,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                    });
                });
            })
        });

        it("Reject wipe contract requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Reject wipe contract requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Reject wipe contract requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0)).to.not.exist;
                })
            })
        })
    })


    describe("Clear", () => {

        before("Set first pool", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 2
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileRetireRequestCreating(wContractId, requestForRetireRequestCreationProgress, 0)
            })
        })

        before("Set second pool", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {

                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR + "Sec",
                        "type": "RETIRE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    let rConractUuid2 = response.body.id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetireContract + rConractUuid2 + "/" + API.PoolContract,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokens: [
                                {
                                    token: tokenId,
                                    count: 3
                                }
                            ],
                            immediately: false
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    })
                });

                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileRetireRequestCreating(wContractId, requestForRetireRequestCreationProgress, 0)
            })
        })

        it("Clear wipe contract requests without auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + wContractId + "/" + API.Requests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + wContractId + "/" + API.Requests,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + wContractId + "/" + API.Requests,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeContract + wConractUuid + "/" + API.Requests,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0)).to.not.exist;
                    expect(response.body.at(1)).to.not.exist;
                })
            })
        })
    })

});
