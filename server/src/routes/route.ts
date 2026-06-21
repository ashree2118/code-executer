import Router from 'express';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pool } from "../db/pool.js";

const router = Router();    
router.get("/health/db", async (_, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows[0]);
});
router.post('/submit', (req, res) => {
    const { language, code } = req.body;

    //validate if the code and language are present
    if (!code || !language) {
        return res.status(400).send('Code and language are required');
    }
    if (language != 'javascript') {
        return res.status(400).send('Only JavaScript code is supported');
    }

    //save the code to a temp file
    let path = `temp/${Math.random().toString(36).substr(2, 9)}.js`;
    
    //execute the code and return the output
    try {
        fs.writeFileSync(path, code);

        const stdout = execSync(`node ${path}`, {
            encoding: 'utf8',
            timeout: 5000
        });

        res.json({
            stdout,
            stderr: '',
            exitCode: 0
        });
    } catch (err: any) {
        res.json({
            stdout: err.stdout?.toString() ?? '',
            stderr: err.stderr?.toString() ?? err.message,
            exitCode: err.status ?? 1
        });
    } finally {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);  //destroy the temp file
        }
        console.log(`Executed code in language: ${language}`);
    }

});

export default router;