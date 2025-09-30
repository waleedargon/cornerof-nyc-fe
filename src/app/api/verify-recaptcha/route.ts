import { NextRequest, NextResponse } from 'next/server';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

// Create the reCAPTCHA client (cached for performance)
let client: RecaptchaEnterpriseServiceClient | null = null;

function getRecaptchaClient() {
  if (!client) {
    // Initialize with service account credentials
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        client = new RecaptchaEnterpriseServiceClient({
          credentials: credentials,
          projectId: credentials.project_id
        });
      } catch (error) {
        console.error('Error parsing service account JSON:', error);
        // Fallback to default authentication
        client = new RecaptchaEnterpriseServiceClient();
      }
    } else {
      // Use default authentication (will use GOOGLE_APPLICATION_CREDENTIALS if set)
      client = new RecaptchaEnterpriseServiceClient();
    }
  }
  return client;
}

/**
 * Create an assessment to analyze the risk of a UI action using Google Cloud reCAPTCHA Enterprise
 * Enhanced version with IP address, user agent, and fingerprinting for better security analysis
 */
async function createAssessment({
  projectID = "cornerof-nyc-a5faf",
  recaptchaKey = "6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n",
  token,
  recaptchaAction = "PHONE_SIGNUP",
  userIpAddress,
  userAgent,
  ja4,
  ja3,
}: {
  projectID?: string;
  recaptchaKey?: string;
  token: string;
  recaptchaAction?: string;
  userIpAddress?: string;
  userAgent?: string;
  ja4?: string;
  ja3?: string;
}) {
  try {
    const client = getRecaptchaClient();
    const projectPath = client.projectPath(projectID);

    // Build the enhanced assessment request with additional security parameters
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaKey,
          userIpAddress: userIpAddress,
          userAgent: userAgent,
          ja4: ja4,
          ja3: ja3,
        },
      },
      parent: projectPath,
    };

    const [response] = await client.createAssessment(request);

    // Check if the token is valid
    if (!response.tokenProperties?.valid) {
      console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties?.invalidReason}`);
      return {
        valid: false,
        reason: response.tokenProperties?.invalidReason || 'Invalid token',
        score: 0
      };
    }

    // Check if the expected action was executed
    if (response.tokenProperties.action === recaptchaAction) {
      // Get the risk score and the reason(s)
      console.log(`The reCAPTCHA score is: ${response.riskAnalysis?.score}`);
      response.riskAnalysis?.reasons?.forEach((reason) => {
        console.log(reason);
      });

      return {
        valid: true,
        action: response.tokenProperties.action,
        score: response.riskAnalysis?.score || 0,
        reasons: response.riskAnalysis?.reasons || []
      };
    } else {
      console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
      return {
        valid: false,
        reason: 'Action mismatch',
        expected: recaptchaAction,
        actual: response.tokenProperties.action,
        score: 0
      };
    }
  } catch (error) {
    console.error('reCAPTCHA Enterprise assessment error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, expectedAction, siteKey } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'reCAPTCHA token is required' }, { status: 400 });
    }

    // Extract additional security parameters from the request
    const userIpAddress = request.ip || 
                         request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // JA3/JA4 fingerprints would typically come from a specialized library
    // For now, we'll pass undefined and let reCAPTCHA handle detection
    const ja3 = request.headers.get('x-ja3-fingerprint');
    const ja4 = request.headers.get('x-ja4-fingerprint');

    console.log('Enhanced reCAPTCHA assessment with:', {
      userIpAddress: userIpAddress.substring(0, 10) + '...',
      userAgent: userAgent.substring(0, 50) + '...',
      hasJA3: !!ja3,
      hasJA4: !!ja4
    });

    // Use the official Google Cloud reCAPTCHA Enterprise client with enhanced parameters
    const assessment = await createAssessment({
      projectID: "cornerof-nyc-a5faf",
      recaptchaKey: siteKey || "6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n",
      token: token,
      recaptchaAction: expectedAction || "PHONE_SIGNUP",
      userIpAddress: userIpAddress,
      userAgent: userAgent,
      ja3: ja3 || undefined,
      ja4: ja4 || undefined
    });

    if (!assessment.valid) {
      return NextResponse.json({ 
        error: 'reCAPTCHA verification failed',
        reason: assessment.reason,
        expected: assessment.expected,
        actual: assessment.actual
      }, { status: 400 });
    }

    // Return success with risk score
    return NextResponse.json({
      success: true,
      valid: assessment.valid,
      action: assessment.action,
      score: assessment.score,
      reasons: assessment.reasons
    });

  } catch (error: any) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}
