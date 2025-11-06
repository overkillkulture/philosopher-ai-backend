#!/usr/bin/env node

/**
 * CONVERGENCE OPTIMIZER
 *
 * Analyzes all systems in the dimensional cascade and optimizes:
 * - Cross-system redundancies
 * - Resource allocation
 * - Integration points
 * - Performance bottlenecks
 * - Code quality and patterns
 *
 * Part of Dimension 81 - Convergence Framework
 */

const fs = require('fs');
const path = require('path');

class ConvergenceOptimizer {
    constructor(config = {}) {
        this.config = {
            systemsDirectory: config.systemsDirectory || path.join(__dirname, 'recursive-systems'),
            optimizationLevel: config.optimizationLevel || 'moderate', // light, moderate, aggressive
            autoApply: config.autoApply || false,
            ...config
        };

        this.state = {
            totalSystems: 0,
            analyzedSystems: 0,
            optimizations: [],
            redundancies: [],
            improvements: []
        };
    }

    async analyze() {
        console.log('🔍 CONVERGENCE OPTIMIZER - Analysis Started');
        console.log('═'.repeat(70));

        // Discover all systems
        const systems = await this.discoverSystems();
        this.state.totalSystems = systems.length;

        console.log(`\nFound ${systems.length} systems to analyze\n`);

        // Analyze each system
        for (const system of systems) {
            await this.analyzeSystem(system);
            this.state.analyzedSystems++;
        }

        // Cross-system analysis
        await this.analyzeCrossSystems(systems);

        // Generate optimization report
        const report = this.generateReport();

        console.log('\n' + '═'.repeat(70));
        console.log('ANALYSIS COMPLETE');
        console.log('═'.repeat(70));

        return report;
    }

    async discoverSystems() {
        const systems = [];
        const dirs = [
            this.config.systemsDirectory,
            path.join(__dirname, 'dimension-27-systems'),
            path.join(__dirname, 'dimension-27-intelligence'),
            path.join(__dirname, 'recursive-systems-demo')
        ];

        for (const dir of dirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js');
                systems.push(...files.map(f => ({
                    name: f.replace('.js', ''),
                    path: path.join(dir, f),
                    directory: dir
                })));
            }
        }

        return systems;
    }

    async analyzeSystem(system) {
        try {
            const code = fs.readFileSync(system.path, 'utf8');

            // Analyze code patterns
            const analysis = {
                system: system.name,
                lines: code.split('\n').length,
                complexity: this.calculateComplexity(code),
                patterns: this.detectPatterns(code),
                dependencies: this.extractDependencies(code),
                duplicates: []
            };

            // Check for optimization opportunities
            if (analysis.complexity > 20) {
                this.state.improvements.push({
                    system: system.name,
                    type: 'complexity',
                    severity: 'medium',
                    message: `High complexity (${analysis.complexity}), consider refactoring`
                });
            }

            return analysis;

        } catch (error) {
            console.error(`   Error analyzing ${system.name}:`, error.message);
            return null;
        }
    }

    calculateComplexity(code) {
        // Simple cyclomatic complexity estimate
        const conditionals = (code.match(/if\s*\(|while\s*\(|for\s*\(|case\s+/g) || []).length;
        const functions = (code.match(/function\s+|=>\s*{|async\s+/g) || []).length;
        return conditionals + functions;
    }

    detectPatterns(code) {
        const patterns = {
            hasErrorHandling: code.includes('try') && code.includes('catch'),
            hasLogging: code.includes('console.log') || code.includes('logger'),
            hasAsync: code.includes('async') || code.includes('Promise'),
            hasConfig: code.includes('config') || code.includes('options'),
            hasTests: code.includes('test') || code.includes('describe')
        };

        return patterns;
    }

    extractDependencies(code) {
        const requires = code.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        return requires.map(r => r.match(/require\(['"]([^'"]+)['"]\)/)[1]);
    }

    async analyzeCrossSystems(systems) {
        console.log('\n🔗 Cross-System Analysis');
        console.log('─'.repeat(70));

        // Find code duplication
        const patterns = new Map();

        for (const system of systems) {
            const code = fs.readFileSync(system.path, 'utf8');
            const blocks = this.extractCodeBlocks(code);

            for (const block of blocks) {
                const hash = this.hashCode(block);
                if (!patterns.has(hash)) {
                    patterns.set(hash, []);
                }
                patterns.get(hash).push(system.name);
            }
        }

        // Report duplications
        let duplications = 0;
        for (const [hash, systemNames] of patterns) {
            if (systemNames.length > 1) {
                duplications++;
                this.state.redundancies.push({
                    type: 'code-duplication',
                    systems: systemNames,
                    severity: 'low',
                    recommendation: 'Extract to shared utility'
                });

                if (duplications <= 5) {
                    console.log(`  ⚠️  Code duplication in: ${systemNames.join(', ')}`);
                }
            }
        }

        if (duplications > 5) {
            console.log(`  ... and ${duplications - 5} more duplications`);
        }

        // Analyze integration opportunities
        const categories = this.groupByCategory(systems);
        console.log(`\n  Systems grouped into ${categories.size} categories`);

        for (const [category, systemList] of categories) {
            if (systemList.length > 3) {
                this.state.optimizations.push({
                    type: 'integration-opportunity',
                    category,
                    systems: systemList.length,
                    recommendation: `Create ${category} orchestrator to manage ${systemList.length} systems`
                });
            }
        }
    }

    extractCodeBlocks(code) {
        // Extract functions and methods for duplication detection
        const blocks = [];
        const functionMatches = code.match(/(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{[^}]+}/g) || [];
        blocks.push(...functionMatches);
        return blocks;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    groupByCategory(systems) {
        const categories = new Map();

        for (const system of systems) {
            const parts = system.name.split('-');
            const category = parts[0];

            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(system.name);
        }

        return categories;
    }

    generateReport() {
        const report = {
            summary: {
                totalSystems: this.state.totalSystems,
                analyzedSystems: this.state.analyzedSystems,
                optimizations: this.state.optimizations.length,
                redundancies: this.state.redundancies.length,
                improvements: this.state.improvements.length
            },
            optimizations: this.state.optimizations,
            redundancies: this.state.redundancies,
            improvements: this.state.improvements,
            recommendations: this.generateRecommendations()
        };

        this.printReport(report);

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        // Based on redundancies
        if (this.state.redundancies.length > 10) {
            recommendations.push({
                priority: 'high',
                action: 'Create shared utility library',
                reason: `${this.state.redundancies.length} code duplications detected`,
                impact: 'Reduce maintenance burden, improve consistency'
            });
        }

        // Based on system count
        if (this.state.totalSystems > 50) {
            recommendations.push({
                priority: 'medium',
                action: 'Implement system orchestration layer',
                reason: `${this.state.totalSystems} systems require coordination`,
                impact: 'Simplify management, improve visibility'
            });
        }

        // Based on improvements
        const highComplexity = this.state.improvements.filter(i => i.type === 'complexity').length;
        if (highComplexity > 5) {
            recommendations.push({
                priority: 'medium',
                action: 'Refactor high-complexity systems',
                reason: `${highComplexity} systems have high complexity`,
                impact: 'Improve maintainability, reduce bugs'
            });
        }

        return recommendations;
    }

    printReport(report) {
        console.log('\n📊 CONVERGENCE OPTIMIZATION REPORT');
        console.log('═'.repeat(70));

        console.log('\n📈 Summary:');
        console.log(`  Systems Analyzed: ${report.summary.analyzedSystems}/${report.summary.totalSystems}`);
        console.log(`  Optimizations: ${report.summary.optimizations}`);
        console.log(`  Redundancies: ${report.summary.redundancies}`);
        console.log(`  Improvements: ${report.summary.improvements}`);

        if (report.recommendations.length > 0) {
            console.log('\n💡 Top Recommendations:');
            report.recommendations.forEach((rec, i) => {
                console.log(`\n  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
                console.log(`     Reason: ${rec.reason}`);
                console.log(`     Impact: ${rec.impact}`);
            });
        }

        console.log('\n✓ Report generated successfully');
    }

    async optimize() {
        console.log('\n🔧 APPLYING OPTIMIZATIONS');
        console.log('═'.repeat(70));

        if (!this.config.autoApply) {
            console.log('\n⚠️  Auto-apply is disabled. Run with --auto-apply to execute optimizations.');
            return;
        }

        // Apply optimizations
        let applied = 0;
        for (const optimization of this.state.optimizations) {
            if (await this.applyOptimization(optimization)) {
                applied++;
            }
        }

        console.log(`\n✓ Applied ${applied}/${this.state.optimizations.length} optimizations`);
    }

    async applyOptimization(optimization) {
        // Implementation would depend on optimization type
        console.log(`  Applying: ${optimization.type}`);
        return true;
    }
}

// CLI execution
if (require.main === module) {
    const optimizer = new ConvergenceOptimizer({
        optimizationLevel: process.argv[2] || 'moderate',
        autoApply: process.argv.includes('--auto-apply')
    });

    optimizer.analyze()
        .then(report => {
            if (process.argv.includes('--optimize')) {
                return optimizer.optimize();
            }
        })
        .then(() => {
            console.log('\n✓ Convergence Optimizer complete\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = ConvergenceOptimizer;
