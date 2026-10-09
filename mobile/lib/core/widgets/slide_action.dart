import 'package:flutter/material.dart';

/// "Slide to go online": the person drags the round handle to the other end to confirm.
/// Harder to trigger by accident than a switch. With [reversed], the handle starts on the right and slides left.
/// Tapping it does nothing except a small nudge; screen readers get a normal button.
class SlideAction extends StatefulWidget {
  const SlideAction({
    super.key,
    required this.label,
    required this.color,
    required this.icon,
    required this.onSlide,
    this.reversed = false,
    this.busy = false,
  });

  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onSlide;
  final bool reversed;
  final bool busy;

  @override
  State<SlideAction> createState() => _SlideActionState();
}

class _SlideActionState extends State<SlideAction> with SingleTickerProviderStateMixin {
  static const _height = 60.0;
  static const _handle = 52.0;
  static const _pad = 4.0;

  late final _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  double _dx = 0; // how far the handle has moved, 0 .. max
  double _max = 1;

  @override
  void initState() {
    super.initState();
    _anim.addListener(() => setState(() => _dx = _anim.value * _max));
  }

  @override
  void didUpdateWidget(SlideAction old) {
    super.didUpdateWidget(old);
    // A new direction (online <-> offline) starts again from the beginning.
    if (old.reversed != widget.reversed) {
      _anim.value = 0;
      _dx = 0;
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  void _drag(DragUpdateDetails d) {
    if (widget.busy) return;
    _anim.stop();
    setState(() => _dx = (_dx + (widget.reversed ? -d.delta.dx : d.delta.dx)).clamp(0, _max));
  }

  void _release(DragEndDetails _) {
    if (widget.busy) return;
    _anim.value = _dx / _max;
    if (_dx > _max * 0.7) {
      _anim.animateTo(1).then((_) => widget.onSlide());
    } else {
      _anim.animateBack(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color;
    return Semantics(
      button: true,
      label: widget.label,
      onTap: widget.busy ? null : widget.onSlide,
      excludeSemantics: true,
      child: LayoutBuilder(
        builder: (context, box) {
          _max = (box.maxWidth - _handle - _pad * 2).clamp(1, double.infinity);
          final progress = _dx / _max;
          final left = widget.reversed ? _pad + _max - _dx : _pad + _dx;
          return Container(
            height: _height,
            decoration: BoxDecoration(
              color: Color.alphaBlend(color.withValues(alpha: 0.10), Colors.white),
              borderRadius: BorderRadius.circular(_height / 2),
            ),
            child: Stack(
              children: [
                // The part already slid over fills with colour.
                Positioned(
                  left: widget.reversed ? left : 0,
                  right: widget.reversed ? 0 : box.maxWidth - left - _handle,
                  top: 0,
                  bottom: 0,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(_height / 2),
                    ),
                  ),
                ),
                Center(
                  child: Opacity(
                    opacity: (1 - progress * 1.4).clamp(0, 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: _handle + 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (widget.reversed) Icon(Icons.keyboard_double_arrow_left, color: color, size: 20),
                          Flexible(
                            child: Text(
                              widget.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                          ),
                          if (!widget.reversed) Icon(Icons.keyboard_double_arrow_right, color: color, size: 20),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: left,
                  top: _pad,
                  child: GestureDetector(
                    onHorizontalDragUpdate: _drag,
                    onHorizontalDragEnd: _release,
                    child: Container(
                      key: const ValueKey('slide-handle'),
                      width: _handle,
                      height: _handle,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: widget.busy
                          ? const Padding(
                              padding: EdgeInsets.all(15),
                              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                            )
                          : Icon(widget.icon, color: Colors.white, size: 26),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
