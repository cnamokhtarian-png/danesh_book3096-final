from trader.models import Decision, Action, Position
from trader.risk import MarketState, RiskConfig, RiskManager


CFG = RiskConfig(
    max_position_pct=5.0,
    max_total_position_pct=15.0,
    max_daily_loss_pct=3.0,
    max_trades_per_day=8,
    cooldown_minutes=30,
    max_spread_pct=1.5,
    min_trade_quote=100_000.0,
)


def market(**overrides):
    base = dict(
        price=1_000_000.0,
        spread_pct=0.2,
        equity_quote=10_000_000.0,
        cash_quote=10_000_000.0,
        holdings=0.0,
        trades_today=0,
        daily_pnl_pct=0.0,
        seconds_since_last_trade=None,
    )
    base.update(overrides)
    return MarketState(**base)


def test_sizes_five_percent_of_equity():
    manager = RiskManager(CFG)
    verdict = manager.size_buy(market())
    assert verdict.approved
    assert verdict.quantity == 0.5  # ۵٪ از ۱۰ میلیون تومان با قیمت ۱ میلیون
    assert verdict.quantity * 1_000_000 == 500_000


def test_caps_at_available_cash():
    manager = RiskManager(CFG)
    verdict = manager.size_buy(market(cash_quote=200_000.0))
    assert verdict.approved
    assert verdict.quantity == 0.2


def test_respects_total_exposure_cap():
    manager = RiskManager(CFG)
    verdict = manager.size_buy(market(holdings=1.4))  # 1.4M از سقف 1.5M
    assert verdict.approved
    assert abs(verdict.quantity * 1_000_000 - 100_000) < 1e-6


def test_blocks_when_total_cap_reached():
    manager = RiskManager(CFG)
    verdict = manager.size_buy(market(holdings=1.5))
    assert not verdict.approved


def test_blocks_wide_spread():
    verdict = RiskManager(CFG).size_buy(market(spread_pct=4.0))
    assert not verdict.approved
    assert "اسپرد" in verdict.reason


def test_blocks_after_daily_loss_limit():
    verdict = RiskManager(CFG).size_buy(market(daily_pnl_pct=-3.2))
    assert not verdict.approved
    assert "ضرر روزانه" in verdict.reason


def test_blocks_after_trade_cap():
    verdict = RiskManager(CFG).size_buy(market(trades_today=8))
    assert not verdict.approved


def test_blocks_during_cooldown():
    verdict = RiskManager(CFG).size_buy(market(seconds_since_last_trade=60))
    assert not verdict.approved
    assert "خنک" in verdict.reason


def test_blocks_below_minimum_notional():
    verdict = RiskManager(CFG).size_buy(market(cash_quote=50_000.0, equity_quote=50_000.0))
    assert not verdict.approved
    assert "حداقل" in verdict.reason


def test_halt_flag_blocks_buy_but_sell_still_allowed_for_exit():
    manager = RiskManager(CFG)
    halted = market(holdings=0.5, trading_halted=True, halt_reason="سوئیچ توقف")
    assert not manager.size_buy(halted).approved
    assert manager.size_sell(halted).approved


def test_sell_requires_holdings():
    manager = RiskManager(CFG)
    assert not manager.size_sell(market()).approved
    verdict = manager.size_sell(market(holdings=0.5))
    assert verdict.approved and verdict.quantity == 0.5


def test_stop_out_rules():
    position = Position(quantity=0.5, avg_price=1_000_000)
    hit, reason = RiskManager.should_stop_out(position, 970_000, 2.0, 4.0)
    assert hit and "حد ضرر" in reason
    hit, reason = RiskManager.should_stop_out(position, 1_050_000, 2.0, 4.0)
    assert hit and "حد سود" in reason
    hit, _ = RiskManager.should_stop_out(position, 1_010_000, 2.0, 4.0)
    assert not hit
    hit, _ = RiskManager.should_stop_out(Position(), 1_010_000, 2.0, 4.0)
    assert not hit
