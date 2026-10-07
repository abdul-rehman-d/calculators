<script lang="ts">
	const DEEL_FEE = 1.42;
	const PAYONEER_WITHDRAWAL_RATE = 0.03;
	const USD_TO_PKR_RATE = 277;

	const usd = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	const pkr = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	let tasks = $state<number | undefined>(10);
	let payPerTask = $state<number | undefined>(6.25);

	function toNonNegativeNumber(value: number | undefined) {
		return typeof value === "number" && Number.isFinite(value) && value > 0
			? value
			: 0;
	}

	function roundCurrency(value: number) {
		return Math.round((value + Number.EPSILON) * 100) / 100;
	}

	const gross = $derived(
		roundCurrency(toNonNegativeNumber(tasks) * toNonNegativeNumber(payPerTask)),
	);
	const afterDeelFee = $derived(
		roundCurrency(Math.max(gross - DEEL_FEE, 0)),
	);
	const afterWithdrawal = $derived(
		roundCurrency(afterDeelFee * (1 - PAYONEER_WITHDRAWAL_RATE)),
	);
	const inBank = $derived(
		roundCurrency(afterWithdrawal * USD_TO_PKR_RATE),
	);
</script>

<form
	class="converter"
	aria-label="Micro1 payment converter"
	novalidate
	onsubmit={(event) => event.preventDefault()}
>
	<div class="fields">
		<label class="field" for="tasks">
			<span>tasks</span>
			<input
				id="tasks"
				name="tasks"
				type="number"
				min="0"
				step="1"
				inputmode="numeric"
				autocomplete="off"
				autofocus
				bind:value={tasks}
			/>
		</label>

		<label class="field" for="pay-per-task">
			<span>pay per task</span>
			<span class="input-with-prefix">
				<span aria-hidden="true">$</span>
				<input
					id="pay-per-task"
					name="pay-per-task"
					type="number"
					min="0"
					step="0.01"
					inputmode="decimal"
					autocomplete="off"
					bind:value={payPerTask}
				/>
			</span>
		</label>
	</div>

	<div class="divider"></div>

	<dl class="results" aria-live="polite">
		<div class="result-row">
			<dt>gross amount</dt>
			<dd><output>{usd.format(gross)}</output></dd>
		</div>

		<div class="result-row">
			<dt>
				payoneer amount
				<span class="tooltip">
					<button
						type="button"
						class="info-button"
						aria-label="About the Payoneer amount"
						aria-describedby="deel-fee-tooltip"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9"></circle>
							<path d="M12 11v5"></path>
							<path d="M12 8h.01"></path>
						</svg>
					</button>
					<span class="tooltip-content" id="deel-fee-tooltip" role="tooltip">
						$1.42 is Deel's fee to transfer to Payoneer.
					</span>
				</span>
			</dt>
			<dd><output>{usd.format(afterDeelFee)}</output></dd>
		</div>

		<div class="result-row">
			<dt>
				payoneer withdrawal fee
				<span class="tooltip">
					<button
						type="button"
						class="info-button"
						aria-label="About the Payoneer withdrawal fee"
						aria-describedby="withdrawal-fee-tooltip"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9"></circle>
							<path d="M12 11v5"></path>
							<path d="M12 8h.01"></path>
						</svg>
					</button>
					<span
						class="tooltip-content"
						id="withdrawal-fee-tooltip"
						role="tooltip"
					>
						3% is Payoneer's withdrawal fee.
					</span>
				</span>
			</dt>
			<dd><output>{usd.format(afterWithdrawal)}</output></dd>
		</div>

		<div class="result-row bank-total">
			<dt>in bank</dt>
			<dd><output>PKR {pkr.format(inBank)}</output></dd>
		</div>
	</dl>
</form>

<style>
	.converter {
		display: flex;
		flex: 1;
		flex-direction: column;
		width: 100%;
	}

	.fields {
		display: grid;
		flex: 1;
		gap: 1rem;
		align-content: start;
	}

	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		color: #f5f5f5;
		font-weight: 500;
		line-height: 1.5;
	}

	.field input {
		width: 7.5rem;
		height: 3rem;
		padding: 0.5rem 0.875rem;
		border: 1px solid #525252;
		border-radius: 0.625rem;
		outline: none;
		background: #171717;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
		color: #f5f5f5;
		font: inherit;
		font-variant-numeric: tabular-nums;
		text-align: right;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
		appearance: textfield;
	}

	.field input::-webkit-inner-spin-button,
	.field input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
	}

	.field input:hover {
		border-color: #737373;
	}

	.field input:focus-visible {
		border-color: #fdba74;
		box-shadow: 0 0 0 3px rgba(253, 186, 116, 0.2);
	}

	.input-with-prefix {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.input-with-prefix > span {
		position: absolute;
		left: 0.875rem;
		z-index: 1;
		color: #737373;
		font-size: 0.875rem;
		pointer-events: none;
	}

	.input-with-prefix input {
		padding-left: 1.75rem;
	}

	.divider {
		height: 1px;
		margin-block: 2rem;
		background: #404040;
	}

	.results {
		display: grid;
		grid-template-columns: minmax(0, max-content) max-content;
		justify-content: end;
		column-gap: clamp(1rem, 3vw, 1.75rem);
		row-gap: 0.75rem;
		width: 100%;
		max-width: 30rem;
		margin: 0 0 0 auto;
	}

	.result-row {
		display: contents;
	}

	.result-row dt,
	.result-row dd {
		margin: 0;
	}

	.result-row dt {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		color: #d4d4d4;
		line-height: 1.4;
	}

	.result-row dd {
		color: #f5f5f5;
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		line-height: 1.4;
		text-align: right;
		white-space: nowrap;
	}

	.bank-total {
		display: contents;
	}

	.bank-total dt,
	.bank-total dd {
		padding-top: 0.5rem;
		color: #f5f5f5;
		font-weight: 600;
	}

	.tooltip {
		position: relative;
		display: inline-flex;
		flex: none;
	}

	.info-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		outline: none;
		background: transparent;
		color: #fdba74;
		cursor: help;
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}

	.info-button:hover,
	.info-button:focus-visible {
		background: rgba(253, 186, 116, 0.12);
		color: #fb923c;
	}

	.info-button:focus-visible {
		box-shadow: 0 0 0 2px #171717, 0 0 0 4px #fdba74;
	}

	.info-button svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.tooltip-content {
		position: absolute;
		bottom: calc(100% + 0.625rem);
		left: 50%;
		z-index: 10;
		width: max-content;
		max-width: min(15rem, 70vw);
		padding: 0.625rem 0.75rem;
		transform: translate(-50%, 0.25rem);
		border: 1px solid #404040;
		border-radius: 0.5rem;
		background: #0a0a0a;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
		color: #e5e5e5;
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.4;
		opacity: 0;
		pointer-events: none;
		text-align: left;
		transition:
			opacity 150ms ease,
			transform 150ms ease;
	}

	.tooltip-content::after {
		position: absolute;
		top: 100%;
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		transform: translate(-50%, -50%) rotate(45deg);
		border-right: 1px solid #404040;
		border-bottom: 1px solid #404040;
		background: #0a0a0a;
		content: "";
	}

	.tooltip:hover .tooltip-content,
	.tooltip:focus-within .tooltip-content {
		transform: translate(-50%, 0);
		opacity: 1;
	}

	@media (min-width: 640px) {
		.fields {
			gap: 1.25rem;
		}

		.field input {
			width: 8.5rem;
			height: 3.25rem;
			font-size: 1.125rem;
		}

		.results {
			row-gap: 0.875rem;
		}

		.result-row dd {
			font-size: 1.125rem;
		}

		.bank-total dd {
			font-size: 1.25rem;
		}
	}
</style>
