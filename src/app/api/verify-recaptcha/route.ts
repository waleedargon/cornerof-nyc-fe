import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, expectedAction, siteKey } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'reCAPTCHA token is required' }, { status: 400 });
    }

    // Get the API key from environment variables
    const apiKey = process.env.RECAPTCHA_API_KEY || process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    if (!apiKey) {
      console.error('Firebase API key not found in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Prepare the request body for reCAPTCHA Enterprise API
    const requestBody = {
      event: {
        token: token,
        expectedAction: expectedAction || 'PHONE_SIGNUP',
        siteKey: siteKey || '6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n',
      }
    };

    // Make the request to reCAPTCHA Enterprise API
    const recaptchaResponse = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/cornerof-nyc-a5faf/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!recaptchaResponse.ok) {
      const errorData = await recaptchaResponse.text();
      console.error('reCAPTCHA Enterprise API error:', errorData);
      return NextResponse.json({ 
        error: 'reCAPTCHA verification failed',
        details: errorData 
      }, { status: 400 });
    }

    const recaptchaResult = await recaptchaResponse.json();

    // Check the assessment result
    const { tokenProperties, riskAnalysis } = recaptchaResult;

    if (!tokenProperties?.valid) {
      return NextResponse.json({ 
        error: 'Invalid reCAPTCHA token',
        reason: tokenProperties?.invalidReason || 'Unknown'
      }, { status: 400 });
    }

    // Check if the action matches
    if (expectedAction && tokenProperties.action !== expectedAction) {
      return NextResponse.json({ 
        error: 'Action mismatch',
        expected: expectedAction,
        actual: tokenProperties.action
      }, { status: 400 });
    }

    // Return success with risk score
    return NextResponse.json({
      success: true,
      valid: tokenProperties.valid,
      action: tokenProperties.action,
      score: riskAnalysis?.score || 0,
      reasons: riskAnalysis?.reasons || []
    });

  } catch (error: any) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}
