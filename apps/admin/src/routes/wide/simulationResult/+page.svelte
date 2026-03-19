<script>
	import { Button } from '@mosiri/ui';
</script>

<div class="regist-view confirm-simulation m-10">
	<div class="text-xl font-bold">シミュレーション実行確認</div>
	<div class="text-center">
		<div class="mx-auto mb-0 mt-[60px] w-[770px] text-left">
			<span>以下の内容でシミュレーションを実行します。</span>
			<br />
			<span>よろしいですか？</span>
		</div>
		<div class="mx-auto mb-0 mt-10 h-40 w-[500px] border border-solid border-primary p-4">
			<div class="mt-12 flex w-full justify-center">
				<span class="inline-block w-48 text-left text-base font-bold">地域</span>
				<span class="inline-block w-96 text-left">静岡市</span>
			</div>
			<div class="mt-6 flex w-full justify-center">
				<span class="inline-block w-48 text-left text-base font-bold">地震動データ</span>
				<span class="inline-block w-96 text-left">人工地震動（広域計算用）</span>
			</div>
		</div>
		<div class="mt-10 flex justify-center space-x-6 text-center">
			<Button>キャンセル</Button>
			<Button>実行</Button>
		</div>
	</div>
</div>
