package com.lifeos.app

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class BackgroundWorker(context: Context, workerParams: WorkerParameters) :
    Worker(context, workerParams) {

    override fun doWork(): Result {
        // Implement your background task here
        return Result.success()
    }
}
