// src/config/endpoints.config.ts

// CODIGO NUEVO

export const ENDPOINTS = {
  MOCK_INT: process.env.MOCK_INT_URL || 'http://internal-OCIAME2IDLB00001-1637202973.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create',
  MOCK_PRE: process.env.MOCK_PRE_URL || 'http://internal-OCIAME2IDLB00001-339266582.eu-west-1.elb.amazonaws.com:8087/disruption/mocks/order/create',
  SOAP_DISRUPTION: process.env.SOAP_DISRUPTION_URL || 'https://reacomapppre.w-sdlc-pre-cc-pss.aws.iberia.es:1992/Reaccom/Reaccom_Disruption_Services',
  SOAP_ACTION: 'http://Reaccom_Admin.svc/IReaccom_Disruption_Services/DisruptionIB'
};
