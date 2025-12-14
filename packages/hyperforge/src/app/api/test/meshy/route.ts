/**
 * Meshy API Test Route
 * Test connectivity and basic functionality of the Meshy API
 */

import { NextRequest, NextResponse } from "next/server";

const MESHY_API_BASE_V1 = "https://api.meshy.ai/openapi/v1";
const MESHY_API_BASE_V2 = "https://api.meshy.ai/openapi/v2";

interface TestResult {
  test: string;
  status: "pass" | "fail" | "skip";
  message: string;
  duration?: number;
}

/**
 * GET /api/test/meshy
 * Run Meshy API tests
 * Query params:
 * - full: Run full test including actual generation (default: false)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fullTest = searchParams.get("full") === "true";

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Check API key presence
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    results.push({
      test: "API Key Presence",
      status: "fail",
      message: "MESHY_API_KEY environment variable is not set",
    });
    return NextResponse.json({
      success: false,
      totalTests: 1,
      passed: 0,
      failed: 1,
      results,
      message: "Meshy API key not configured",
    });
  }
  results.push({
    test: "API Key Presence",
    status: "pass",
    message: "MESHY_API_KEY is set",
  });

  // Test 2: API connectivity (balance endpoint)
  try {
    const balanceStart = Date.now();
    const balanceResponse = await fetch(`${MESHY_API_BASE_V1}/balance`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const balanceDuration = Date.now() - balanceStart;

    if (!balanceResponse.ok) {
      const error = await balanceResponse.text();
      results.push({
        test: "API Connectivity (Balance)",
        status: "fail",
        message: `HTTP ${balanceResponse.status}: ${error}`,
        duration: balanceDuration,
      });
    } else {
      const balance = await balanceResponse.json();
      results.push({
        test: "API Connectivity (Balance)",
        status: "pass",
        message: `Connected. Credits: ${balance.credits || balance.remaining_credits || "N/A"}`,
        duration: balanceDuration,
      });
    }
  } catch (error) {
    results.push({
      test: "API Connectivity (Balance)",
      status: "fail",
      message: error instanceof Error ? error.message : "Network error",
    });
  }

  // Test 3: List tasks (v2 API)
  try {
    const listStart = Date.now();
    const listResponse = await fetch(
      `${MESHY_API_BASE_V2}/text-to-3d?page_num=1&page_size=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const listDuration = Date.now() - listStart;

    if (!listResponse.ok) {
      const error = await listResponse.text();
      results.push({
        test: "List Tasks (v2 API)",
        status: "fail",
        message: `HTTP ${listResponse.status}: ${error}`,
        duration: listDuration,
      });
    } else {
      const tasks = await listResponse.json();
      const taskCount = tasks.tasks?.length ?? tasks.result?.length ?? 0;
      results.push({
        test: "List Tasks (v2 API)",
        status: "pass",
        message: `v2 API accessible. Found ${taskCount} recent task(s)`,
        duration: listDuration,
      });
    }
  } catch (error) {
    results.push({
      test: "List Tasks (v2 API)",
      status: "fail",
      message: error instanceof Error ? error.message : "Network error",
    });
  }

  // Test 4: List image-to-3d tasks (v1 API)
  try {
    const listStart = Date.now();
    const listResponse = await fetch(
      `${MESHY_API_BASE_V1}/image-to-3d?page_num=1&page_size=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const listDuration = Date.now() - listStart;

    if (!listResponse.ok) {
      const error = await listResponse.text();
      results.push({
        test: "List Tasks (v1 API)",
        status: "fail",
        message: `HTTP ${listResponse.status}: ${error}`,
        duration: listDuration,
      });
    } else {
      const tasks = await listResponse.json();
      const taskCount = tasks.tasks?.length ?? tasks.result?.length ?? 0;
      results.push({
        test: "List Tasks (v1 API)",
        status: "pass",
        message: `v1 API accessible. Found ${taskCount} recent task(s)`,
        duration: listDuration,
      });
    }
  } catch (error) {
    results.push({
      test: "List Tasks (v1 API)",
      status: "fail",
      message: error instanceof Error ? error.message : "Network error",
    });
  }

  // Test 5: Full generation test (optional)
  if (fullTest) {
    try {
      const genStart = Date.now();

      // Create a simple text-to-3d preview task
      const createResponse = await fetch(`${MESHY_API_BASE_V2}/text-to-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "preview",
          prompt: "a simple red cube",
          art_style: "realistic",
          ai_model: "latest",
          target_polycount: 1000,
        }),
      });
      const genDuration = Date.now() - genStart;

      if (!createResponse.ok) {
        const error = await createResponse.text();
        results.push({
          test: "Create Text-to-3D Task",
          status: "fail",
          message: `HTTP ${createResponse.status}: ${error}`,
          duration: genDuration,
        });
      } else {
        const task = await createResponse.json();
        const taskId = task.result || task.task_id || task.id;
        results.push({
          test: "Create Text-to-3D Task",
          status: "pass",
          message: `Task created: ${taskId}`,
          duration: genDuration,
        });

        // Check task status
        if (taskId) {
          const statusStart = Date.now();
          const statusResponse = await fetch(
            `${MESHY_API_BASE_V2}/tasks/${taskId}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            },
          );
          const statusDuration = Date.now() - statusStart;

          if (!statusResponse.ok) {
            const error = await statusResponse.text();
            results.push({
              test: "Get Task Status",
              status: "fail",
              message: `HTTP ${statusResponse.status}: ${error}`,
              duration: statusDuration,
            });
          } else {
            const status = await statusResponse.json();
            results.push({
              test: "Get Task Status",
              status: "pass",
              message: `Status: ${status.status}, Progress: ${status.progress || 0}%`,
              duration: statusDuration,
            });
          }
        }
      }
    } catch (error) {
      results.push({
        test: "Create Text-to-3D Task",
        status: "fail",
        message: error instanceof Error ? error.message : "Network error",
      });
    }
  } else {
    results.push({
      test: "Full Generation Test",
      status: "skip",
      message: "Skipped (add ?full=true to run)",
    });
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  return NextResponse.json({
    success: failed === 0,
    totalTests: results.length,
    passed,
    failed,
    skipped,
    duration: totalDuration,
    results,
    message:
      failed === 0 ? "All Meshy API tests passed" : `${failed} test(s) failed`,
  });
}
